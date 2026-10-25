import hashlib
import importlib.util
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


bundle = module("verify-bundle")
play = module("play-state")


def elf(headers):
    data = bytearray(64 + 56 * len(headers))
    data[:6] = b"\x7fELF\x02\x01"
    struct.pack_into("<Q", data, 32, 64)
    struct.pack_into("<HH", data, 54, 56, len(headers))
    for index, values in enumerate(headers):
        struct.pack_into("<IIQQQQQQ", data, 64 + index * 56, *values)
    return bytes(data)


class NativeAlignmentTest(unittest.TestCase):
    def test_rejects_4k_load_alignment(self):
        with self.assertRaisesRegex(ValueError, "LOAD"):
            bundle.native_alignment(elf([(1, 5, 0, 0, 0, 4096, 4096, 4096)]), "bad.so")

    def test_accepts_padded_relro_separate_from_writable_load(self):
        bundle.native_alignment(elf([
            (1, 6, 0, 0, 0, 0x390, 0x390, 0x4000),
            (1, 6, 0x390, 0x4390, 0, 0, 0x10, 0x4000),
            (0x6474E552, 4, 0, 0, 0, 0x390, 0x1000, 1),
        ]), "padded.so")

    def test_rejects_relro_rounding_into_writable_data(self):
        with self.assertRaisesRegex(ValueError, "RELRO"):
            bundle.native_alignment(elf([
                (1, 6, 0, 0, 0, 0x4000, 0x4000, 0x4000),
                (0x6474E552, 4, 0, 0, 0, 0x1000, 0x1000, 1),
            ]), "overlap.so")


class Response:
    def __init__(self, value):
        self.value = value

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass

    def read(self):
        return json.dumps(self.value).encode()


class PlayRetryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.checksum = hashlib.sha256(b"verified bundle").hexdigest()
        (self.directory / "androidApp-release.aab").write_bytes(b"verified bundle")
        self.metadata = {"sha256": self.checksum, "commit": "commit", "versionCode": 100002, "versionName": "0.1.1"}
        (self.directory / "release.json").write_text(json.dumps(self.metadata))
        self.bundles = []
        self.tracks = []
        self.production = []
        self.calls = []
        environment = patch.dict(os.environ, {"GITHUB_SHA": "commit", "PLAY_ACCESS_TOKEN": "test", "PLAY_RELEASE_STATUS": "draft"})
        environment.start()
        self.addCleanup(environment.stop)

    def api(self, request, **_):
        method, url = request.get_method(), request.full_url
        self.calls.append((method, url))
        if url.endswith("/bundles"):
            return Response({"bundles": self.bundles})
        if url.endswith("/tracks"):
            return Response({"tracks": self.tracks})
        if url.endswith("/tracks/production/releases"):
            return Response({"releases": self.production})
        return Response({"id": "edit"})

    def inspect(self, verify=False):
        with patch.object(play.urllib.request, "urlopen", self.api):
            play.inspect(self.directory, verify)

    def test_new_version_needs_upload(self):
        self.inspect()
        self.assertFalse(any(method == "PUT" for method, _ in self.calls))

    def test_retry_of_same_release_does_not_change_tracks(self):
        self.bundles = [{"versionCode": 100002, "sha256": self.checksum}]
        self.tracks = [{"track": "internal", "releases": [{"versionCodes": ["100002"], "status": "draft"}]}]
        self.inspect(verify=True)
        self.assertFalse(any(method == "PUT" for method, _ in self.calls))

    def test_rejects_version_with_different_bytes(self):
        self.bundles = [{"versionCode": 100002, "sha256": "different"}]
        with self.assertRaisesRegex(ValueError, "different bytes"):
            self.inspect()

    def test_rejects_stale_candidate(self):
        self.tracks = [{"track": "internal", "releases": [{"versionCodes": ["100003"]}]}]
        with self.assertRaisesRegex(ValueError, "stale"):
            self.inspect()

    def test_orphan_upload_reuses_existing_bundle(self):
        self.bundles = [{"versionCode": 100002, "sha256": self.checksum}]
        with patch.object(Path, "read_text", autospec=True, side_effect=lambda path: json.dumps(self.metadata) if path.name == "release.json" else "Release notes"):
            self.inspect()
        self.assertTrue(any(method == "PUT" for method, _ in self.calls))
        self.assertFalse(any(method == "DELETE" for method, _ in self.calls))

    def test_artifact_tampering_fails_before_network(self):
        (self.directory / "androidApp-release.aab").write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.inspect()
        self.assertEqual(self.calls, [])

    def test_internal_upload_cannot_restart_production_review(self):
        self.production = [{"releaseLifecycleState": "RELEASE_LIFECYCLE_STATE_IN_REVIEW"}]
        with self.assertRaisesRegex(ValueError, "Production is in review"):
            self.inspect()
        self.assertFalse(any(method == "PUT" for method, _ in self.calls))

    def test_orphan_recovery_cannot_restart_production_review(self):
        self.bundles = [{"versionCode": 100002, "sha256": self.checksum}]
        self.production = [{"releaseLifecycleState": "RELEASE_LIFECYCLE_STATE_IN_REVIEW"}]
        with self.assertRaisesRegex(ValueError, "Production is in review"):
            self.inspect()
        self.assertFalse(any(method == "PUT" for method, _ in self.calls))

    def test_noop_internal_retry_can_verify_during_production_review(self):
        self.bundles = [{"versionCode": 100002, "sha256": self.checksum}]
        self.tracks = [{"track": "internal", "releases": [{"versionCodes": ["100002"], "status": "draft"}]}]
        self.production = [{"releaseLifecycleState": "RELEASE_LIFECYCLE_STATE_IN_REVIEW"}]
        self.inspect()
        self.assertFalse(any(method == "PUT" for method, _ in self.calls))


if __name__ == "__main__":
    unittest.main()
