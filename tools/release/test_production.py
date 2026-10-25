import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import urllib.error
from unittest.mock import patch


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


production = module("promote-production")
artifact = module("production-artifact")


def track(code, status="completed", name="production"):
    return {"track": name, "releases": [{"versionCodes": [str(code)], "status": status}]}


class ProductionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.code = 100003
        self.checksum = hashlib.sha256(b"tested").hexdigest()
        self.metadata = {"applicationId": "app.plainoss.arruler", "versionCode": self.code,
                         "versionName": "0.1.2", "commit": "tested-commit", "sha256": self.checksum,
                         "uploadCertificateSha256": "certificate"}
        (self.directory / "androidApp-release.aab").write_bytes(b"tested")
        (self.directory / "release.json").write_text(json.dumps(self.metadata))
        (self.directory / "production-notes.txt").write_text("Tested release notes")
        self.bundles = [{"versionCode": self.code, "sha256": self.checksum}]
        self.tracks = [track(100002), track(100004, name="internal")]
        self.calls = []
        self.commit_error = False
        self.cleanup_error = False

    def api(self, method, suffix, body=None):
        self.calls.append((method, suffix, body))
        if suffix == "/edits":
            return {"id": "edit"}
        if suffix.endswith("/bundles"):
            return {"bundles": self.bundles}
        if suffix.endswith("/tracks"):
            return {"tracks": self.tracks}
        if ":commit" in suffix and self.commit_error:
            raise TimeoutError("Ambiguous commit")
        if method == "DELETE" and self.cleanup_error:
            raise RuntimeError("Edit no longer exists")
        if suffix == "/tracks/production/releases":
            return {"releases": [{"activeArtifacts": [{"versionCode": self.code}],
                                  "releaseLifecycleState": "RELEASE_LIFECYCLE_STATE_IN_REVIEW"}]}
        return {}

    def promote(self):
        with patch.object(production, "api", self.api), patch.dict(os.environ, {}, clear=True):
            return production.promote(self.directory, self.code, "certificate")

    def test_promotes_exact_bundle_despite_newer_internal_version(self):
        self.assertEqual(self.promote(), "submitted")
        writes = [body for method, _, body in self.calls if method == "PUT"]
        self.assertEqual(writes, [{"track": "production", "releases": [{"name": "0.1.2",
            "versionCodes": [str(self.code)], "status": "completed",
            "releaseNotes": [{"language": "en-US", "text": "Tested release notes"}]}]}])
        self.assertTrue(any(":validate" in suffix for _, suffix, _ in self.calls))
        commit = next(suffix for _, suffix, _ in self.calls if ":commit" in suffix)
        self.assertIn("changesInReviewBehavior=ERROR_IF_IN_REVIEW", commit)
        self.assertIn("changesNotSentForReview=false", commit)
        self.assertFalse(any(method == "DELETE" for method, _, _ in self.calls))

    def test_retry_is_noop_after_committed_submission(self):
        self.tracks = [track(self.code)]
        self.assertEqual(self.promote(), "already-submitted")
        self.assertFalse(any(method == "PUT" for method, _, _ in self.calls))

    def test_ambiguous_commit_keeps_original_error_and_can_be_retried(self):
        self.commit_error = self.cleanup_error = True
        with self.assertRaisesRegex(TimeoutError, "Ambiguous commit"):
            self.promote()
        self.commit_error = self.cleanup_error = False
        self.tracks = [track(self.code)]
        self.calls = []
        self.assertEqual(self.promote(), "already-submitted")
        self.assertFalse(any(method == "PUT" for method, _, _ in self.calls))

    def test_rejects_downgrade_pending_staged_and_halted_releases(self):
        for candidate in [track(100004), track(100002, "draft"),
                          track(100002, "inProgress"), track(self.code, "halted")]:
            with self.subTest(track=candidate):
                self.tracks = [candidate]
                self.calls = []
                with self.assertRaises(ValueError):
                    self.promote()
                self.assertFalse(any(method == "PUT" for method, _, _ in self.calls))

    def test_first_release_needs_no_existing_production_track(self):
        self.tracks = [track(self.code, name="internal")]
        self.assertEqual(self.promote(), "submitted")

    def test_rejects_missing_bundle_and_play_checksum_mismatch(self):
        for bundles in [[], [{"versionCode": self.code, "sha256": "wrong"}]]:
            self.bundles = bundles
            with self.assertRaisesRegex(ValueError, "exact tested bundle"):
                self.promote()

    def test_rejects_tampered_artifact_before_network(self):
        for key, value in [("applicationId", "other.app"), ("versionCode", 100004),
                           ("sha256", "wrong"), ("uploadCertificateSha256", "wrong")]:
            with self.subTest(field=key):
                (self.directory / "release.json").write_text(json.dumps({**self.metadata, key: value}))
                with self.assertRaisesRegex(ValueError, "mismatch"):
                    self.promote()
                self.assertEqual(self.calls, [])

    def test_summary_does_not_claim_submission_is_publication(self):
        (self.directory / "production-source.json").write_text(json.dumps({
            "runUrl": "https://github.com/plainoss/plainoss/actions/runs/123", "actor": "developer"}))
        summary = self.directory / "summary"
        with patch.object(production, "api", self.api), patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(summary)}):
            production.promote(self.directory, self.code, "certificate")
        self.assertIn("IN_REVIEW", summary.read_text())
        self.assertIn("not proof of public availability", summary.read_text())


class PlayErrorTest(unittest.TestCase):
    def test_first_production_release_explains_console_bootstrap(self):
        error = urllib.error.HTTPError("https://example.test", 400, "Bad Request", {},
            io.BytesIO(b'{"error":{"message":"Only releases with status draft may be created on draft app."}}'))
        with patch.object(production.urllib.request, "urlopen", side_effect=error), patch.dict(
                os.environ, {"PLAY_ACCESS_TOKEN": "test-token"}):
            with self.assertRaisesRegex(RuntimeError, "First production release requires Play Console"):
                production.api("POST", "/edits/test:validate")


class VersionSelectionTest(unittest.TestCase):
    def test_accepts_visible_version_name_or_numeric_code(self):
        self.assertEqual(artifact.resolve_version("0.1.7", 100001), (100008, "0.1.7"))
        self.assertEqual(artifact.resolve_version(" 100008 ", 100001), (100008, None))

    def test_rejects_ambiguous_or_invalid_selection(self):
        for value in ["latest", "", "0.1.0", "0.1.07", "v0.1.7", "-1", "100001", "2100000001"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                artifact.resolve_version(value, 100001)


class ArtifactTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name) / "release"
        self.run = {"run_number": 2, "id": 123, "path": artifact.WORKFLOW, "head_branch": "main",
                    "head_repository": {"full_name": "plainoss/plainoss"}, "event": "push",
                    "status": "completed", "conclusion": "success", "head_sha": "tested-commit",
                    "html_url": "https://github.com/plainoss/plainoss/actions/runs/123"}
        self.metadata = {"applicationId": "app.plainoss.arruler", "versionCode": 100003, "versionName": "0.1.2",
                         "commit": "tested-commit", "sha256": hashlib.sha256(b"tested").hexdigest()}
        self.publish_status = "success"
        self.downloads = 0
        environment = patch.dict(os.environ, {"GITHUB_TRIGGERING_ACTOR": "developer"})
        environment.start()
        self.addCleanup(environment.stop)

    def gh(self, *args):
        if args[0] == "run":
            self.downloads += 1
            (self.directory / "release.json").write_text(json.dumps(self.metadata))
            (self.directory / "androidApp-release.aab").write_bytes(b"tested")
            return ""
        if "/runs?" in args[-1]:
            return json.dumps([{ "workflow_runs": [self.run]}])
        if "/jobs?" in args[-1]:
            return json.dumps([{ "jobs": [{"name": "publish", "conclusion": self.publish_status}]}])
        self.assertIn("ref=tested-commit", args[-1])
        return "Original release notes"

    def download(self):
        with patch.object(artifact, "gh", self.gh), patch.dict(os.environ, {
                "GITHUB_REPOSITORY": "plainoss/plainoss", "VERSION_OFFSET": "100001", "GITHUB_ACTOR": "developer"}):
            return artifact.download(100003, self.directory)

    def test_downloads_original_artifact_and_notes(self):
        self.assertEqual(self.download(), self.metadata)
        self.assertEqual(self.downloads, 1)
        self.assertEqual((self.directory / "production-notes.txt").read_text(), "Original release notes")
        self.assertEqual(json.loads((self.directory / "production-source.json").read_text())["actor"], "developer")

    def test_rejects_untrusted_or_unsuccessful_sources_before_download(self):
        original = self.run.copy()
        for field, value in [("head_branch", "feature"), ("path", "other.yml"),
                             ("conclusion", "failure"), ("event", "pull_request"),
                             ("head_repository", {"full_name": "other/repo"})]:
            with self.subTest(field=field):
                self.run = {**original, field: value}
                with self.assertRaisesRegex(ValueError, "trusted"):
                    self.download()
                self.assertEqual(self.downloads, 0)

    def test_rejects_run_with_skipped_publish_job(self):
        self.publish_status = "skipped"
        with self.assertRaisesRegex(ValueError, "successfully publish"):
            self.download()
        self.assertEqual(self.downloads, 0)

    def test_records_the_developer_who_reruns_the_workflow(self):
        with patch.dict(os.environ, {"GITHUB_TRIGGERING_ACTOR": "rerun-developer"}):
            self.download()
        self.assertEqual(json.loads((self.directory / "production-source.json").read_text())["actor"], "rerun-developer")

    def test_rejects_version_name_that_does_not_match_original_metadata(self):
        with patch.object(artifact, "gh", self.gh), patch.dict(os.environ, {
                "GITHUB_REPOSITORY": "plainoss/plainoss", "VERSION_OFFSET": "100001", "GITHUB_ACTOR": "developer"}):
            with self.assertRaisesRegex(ValueError, "identity"):
                artifact.download(100003, self.directory, expected_name="0.1.7")

    def test_rejects_wrong_artifact_version(self):
        self.metadata["versionCode"] = 100004
        with self.assertRaisesRegex(ValueError, "identity"):
            self.download()


if __name__ == "__main__":
    unittest.main()
