#!/usr/bin/env python3
"""Reconcile an internal upload retry with Play; never silently change version codes."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.request


def inspect(directory, verify=False):
    metadata = json.loads((directory / "release.json").read_text())
    bundle = directory / "androidApp-release.aab"
    checksum = hashlib.sha256(bundle.read_bytes()).hexdigest()
    if checksum != metadata["sha256"] or metadata["commit"] != os.environ["GITHUB_SHA"]:
        raise ValueError("Artifact checksum or source commit mismatch")
    base = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app.plainoss.arruler/edits"

    def api(method, suffix="", body=None):
        request = urllib.request.Request(base + suffix, method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": "Bearer " + os.environ["PLAY_ACCESS_TOKEN"],
                     "Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
            return json.loads(data) if data else {}

    edit = api("POST", body={})["id"]
    committed = False
    try:
        bundles = api("GET", f"/{edit}/bundles").get("bundles", [])
        tracks = api("GET", f"/{edit}/tracks").get("tracks", [])
        code = metadata["versionCode"]
        existing = next((b for b in bundles if b["versionCode"] == code), None)
        published = any(t["track"] == "internal" and
            any(str(code) in r.get("versionCodes", []) and r.get("status") == os.environ.get("PLAY_RELEASE_STATUS", "completed")
                for r in t.get("releases", [])) for t in tracks)
        if existing and existing.get("sha256", "").lower() != checksum:
            raise ValueError("Play already contains different bytes for this version; refusing to publish")
        all_codes = [b["versionCode"] for b in bundles]
        all_codes += [int(v) for t in tracks for r in t.get("releases", []) for v in r.get("versionCodes", [])]
        if max(all_codes, default=0) > code:
            raise ValueError("Candidate is stale: Play already contains a newer version")
        if not existing and code in all_codes:
            raise ValueError("This version code is already used by another artifact")
        if published and existing:
            state = "published"
        elif existing:
            # Recover a committed upload whose track update did not finish. Use the
            # same checksum and version; do not try uploading the bundle again.
            notes_file = Path("apps/ar-ruler-mobile/androidApp/src/main/play/release-notes/en-US/internal.txt")
            release = {"name": metadata["versionName"], "versionCodes": [str(code)],
                       "status": os.environ.get("PLAY_RELEASE_STATUS", "completed"),
                       "releaseNotes": [{"language": "en-US", "text": notes_file.read_text().strip()}]}
            if verify:
                raise ValueError("Bundle exists, but the expected internal release was not found")
            api("PUT", f"/{edit}/tracks/internal", {"track": "internal", "releases": [release]})
            api("POST", f"/{edit}:commit", {})
            committed = True
            state = "published"
        else:
            if published or verify:
                raise ValueError("Expected bundle and internal release were not found")
            state = "upload"
    finally:
        if not committed:
            api("DELETE", f"/{edit}")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a") as stream:
            stream.write(f"state={state}\n")
    print(f"Play internal version {code}: {state}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    inspect(args.directory, args.verify)
