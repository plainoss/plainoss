#!/usr/bin/env python3
"""Find and download the original internal CI artifact for a tested version."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess


WORKFLOW = ".github/workflows/publish-ar-ruler-internal.yml"


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)


def download(code, directory):
    if not 1 <= code <= 2100000000:
        raise ValueError("Invalid Android version code")
    repository = os.environ["GITHUB_REPOSITORY"]
    offset = int(os.environ["VERSION_OFFSET"])
    run_number = code - offset
    if run_number < 1:
        raise ValueError("Version does not belong to the configured internal workflow")
    pages = json.loads(gh("api", "--paginate", "--slurp",
        f"repos/{repository}/actions/workflows/publish-ar-ruler-internal.yml/runs?branch=main&per_page=100"))
    matches = [run for page in pages for run in page["workflow_runs"] if run["run_number"] == run_number]
    if len(matches) != 1:
        raise ValueError("Could not uniquely locate the original internal workflow run")
    run = matches[0]
    if (run["path"] != WORKFLOW or run["head_branch"] != "main" or
            run["head_repository"]["full_name"] != repository or
            run["event"] not in ("push", "workflow_dispatch") or
            run["status"] != "completed" or run["conclusion"] != "success"):
        raise ValueError("Source must be a successful trusted internal workflow run on main")
    jobs = json.loads(gh("api", "--paginate", "--slurp",
        f"repos/{repository}/actions/runs/{run['id']}/jobs?per_page=100"))
    if not any(job["name"] == "publish" and job["conclusion"] == "success"
               for page in jobs for job in page["jobs"]):
        raise ValueError("The source run did not successfully publish to internal testing")
    directory.mkdir(parents=True, exist_ok=False)
    gh("run", "download", str(run["id"]), "--repo", repository,
       "--name", f"ar-ruler-release-{run['id']}", "--dir", str(directory))
    metadata = json.loads((directory / "release.json").read_text())
    if (metadata["applicationId"] != "app.plainoss.arruler" or metadata["versionCode"] != code or
            metadata["commit"] != run["head_sha"] or
            hashlib.sha256((directory / "androidApp-release.aab").read_bytes()).hexdigest() != metadata["sha256"]):
        raise ValueError("Artifact identity, source commit or checksum mismatch")
    # Read notes from the tested source, not today's main branch.
    notes = gh("api", "-H", "Accept: application/vnd.github.raw+json",
        f"repos/{repository}/contents/apps/ar-ruler-mobile/androidApp/src/main/play/release-notes/en-US/internal.txt?ref={run['head_sha']}")
    (directory / "production-notes.txt").write_text(notes)
    provenance = {"runId": run["id"], "runUrl": run["html_url"],
                  "actor": os.environ.get("GITHUB_TRIGGERING_ACTOR", os.environ["GITHUB_ACTOR"])}
    (directory / "production-source.json").write_text(json.dumps(provenance, indent=2) + "\n")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version_code", type=int)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    download(args.version_code, args.directory)
