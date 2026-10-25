#!/usr/bin/env python3
"""Promote a verified, previously tested bundle without uploading or rebuilding."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.request


BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app.plainoss.arruler"


def api(method, suffix, body=None):
    request = urllib.request.Request(BASE + suffix, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + os.environ["PLAY_ACCESS_TOKEN"],
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
            return json.loads(data) if data else {}
    except urllib.error.HTTPError as error:
        # Include Play's actionable error, never the request's bearer token.
        detail = error.read().decode()
        if "Only releases with status draft may be created on draft app" in detail:
            raise RuntimeError("First production release requires Play Console setup. Open "
                               "Test and release → Production, create a release using the existing "
                               "verified version, and send it for review. No API release was committed. "
                               "After Console submission, rerun this same version to verify its state.") from None
        raise RuntimeError(f"Play API {method} failed ({error.code}): {detail}") from None


def validate_artifact(directory, code, certificate):
    metadata = json.loads((directory / "release.json").read_text())
    checksum = hashlib.sha256((directory / "androidApp-release.aab").read_bytes()).hexdigest()
    if (metadata["applicationId"] != "app.plainoss.arruler" or metadata["versionCode"] != code or
            metadata["sha256"] != checksum or
            metadata["uploadCertificateSha256"].lower() != certificate.replace(":", "").lower()):
        raise ValueError("Artifact identity, checksum or upload certificate mismatch")
    return metadata


def production_action(tracks, code):
    releases = next((t.get("releases", []) for t in tracks if t["track"] == "production"), [])
    if any(int(v) > code for r in releases for v in r.get("versionCodes", [])):
        raise ValueError("Production contains a newer version; refusing a downgrade")
    if any(r.get("status") in ("inProgress", "halted") for r in releases):
        raise ValueError("Resolve the staged or halted production release in Console first")
    matching = [r for r in releases if str(code) in r.get("versionCodes", [])]
    if matching:
        if len(matching) == 1 and matching[0].get("status") == "completed":
            return "already-submitted"
        raise ValueError("Candidate has an unexpected production state; inspect Console")
    if any(r.get("status") != "completed" for r in releases):
        raise ValueError("Production has another pending release; inspect Console")
    return "submit"


def promote(directory, code, certificate):
    metadata = validate_artifact(directory, code, certificate)
    notes = (directory / "production-notes.txt").read_text().strip()
    if not notes or len(notes) > 500:
        raise ValueError("Production release notes must contain 1–500 characters")
    edit = api("POST", "/edits", {})["id"]
    committed = False
    try:
        bundles = api("GET", f"/edits/{edit}/bundles").get("bundles", [])
        existing = next((b for b in bundles if b["versionCode"] == code), None)
        if not existing:
            raise ValueError(f"Play's current bundles do not contain the exact tested bundle {code}. "
                             "It may have been archived after a newer internal release. Check App "
                             "bundle explorer in Console; do not substitute a newer version silently.")
        if existing.get("sha256", "").lower() != metadata["sha256"]:
            raise ValueError(f"Play checksum differs from the exact tested bundle {code}; "
                             "refusing to submit different bytes")
        state = production_action(api("GET", f"/edits/{edit}/tracks").get("tracks", []), code)
        if state == "submit":
            release = {"name": metadata["versionName"], "versionCodes": [str(code)], "status": "completed",
                       "releaseNotes": [{"language": "en-US", "text": notes}]}
            api("PUT", f"/edits/{edit}/tracks/production", {"track": "production", "releases": [release]})
            api("POST", f"/edits/{edit}:validate")
            # Never cancel an existing Google review, or silently leave a draft.
            api("POST", f"/edits/{edit}:commit?changesNotSentForReview=false&changesInReviewBehavior=ERROR_IF_IN_REVIEW")
            committed = True
            state = "submitted"
    finally:
        if not committed:
            # A timed-out commit may already have succeeded. Preserve its error;
            # a rerun reconciles committed production state before mutating it.
            try:
                api("DELETE", f"/edits/{edit}")
            except Exception as error:
                print(f"Edit cleanup failed: {error}")
    # Track status completed expresses rollout intent, not review/public availability.
    summaries = api("GET", "/tracks/production/releases").get("releases", [])
    matching = [r for r in summaries if any(a["versionCode"] == code for a in r.get("activeArtifacts", []))]
    lifecycle = matching[0].get("releaseLifecycleState", "UNKNOWN") if len(matching) == 1 else "UNKNOWN"
    print(f"Production version {code}: {state}; Play lifecycle: {lifecycle}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        provenance = json.loads((directory / "production-source.json").read_text())
        with open(summary, "a") as stream:
            stream.write(f"### Production version {code}: {state}\n\n"
                         f"Play lifecycle: `{lifecycle}`. A submission is not proof of public availability.\n\n"
                         f"Source: {provenance['runUrl']}\n\n"
                         f"Commit: `{metadata['commit']}`\n\nSHA-256: `{metadata['sha256']}`\n\n"
                         f"Device testing confirmed by: {provenance['actor']}\n\n"
                         "[Check review and publishing status](https://play.google.com/console/u/0/developers/4770520382078237373/app/4974369210017680707/publishing)\n")
    return state


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("version_code", type=int)
    args = parser.parse_args()
    promote(args.directory, args.version_code, os.environ["ANDROID_UPLOAD_CERTIFICATE_SHA256"])
