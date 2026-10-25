#!/usr/bin/env python3
"""Find and download the original internal CI artifact for a tested version."""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess


WORKFLOW = ".github/workflows/publish-ar-ruler-internal.yml"


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)


def resolve_version(value, offset):
    value = value.strip()
    name = re.fullmatch(r"0\.1\.([1-9][0-9]*)", value)
    if name:
        # Internal CI assigns 0.1.<run_number> and offset + run_number.
        code = offset + int(name[1])
    elif re.fullmatch(r"[1-9][0-9]*", value):
        code = int(value)
    else:
        raise ValueError("Enter the exact Play version name (for example 0.1.7) or numeric "
                         "version code (for example 100008). No release was selected.")
    if not 1 <= code <= 2100000000 or code <= offset:
        raise ValueError("Version is outside the configured internal release sequence")
    return code, value if name else None


def download(code, directory, expected_name=None):
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
            (expected_name is not None and metadata.get("versionName") != expected_name) or
            hashlib.sha256((directory / "androidApp-release.aab").read_bytes()).hexdigest() != metadata["sha256"]):
        raise ValueError("Artifact identity, source commit or checksum mismatch")
    # Read notes from the tested source, not today's main branch.
    notes = gh("api", "-H", "Accept: application/vnd.github.raw+json",
        f"repos/{repository}/contents/apps/ar-ruler-mobile/androidApp/src/main/play/release-notes/en-US/internal.txt?ref={run['head_sha']}")
    (directory / "production-notes.txt").write_text(notes)
    provenance = {"runId": run["id"], "runUrl": run["html_url"],
                  "actor": os.environ.get("GITHUB_TRIGGERING_ACTOR", os.environ["GITHUB_ACTOR"])}
    (directory / "production-source.json").write_text(json.dumps(provenance, indent=2) + "\n")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as stream:
            stream.write(f"### Selected release: {metadata.get('versionName', code)} ({code})\n\n"
                         f"Original internal run: {run['html_url']}\n\n"
                         f"Source commit: `{metadata['commit']}`\n\n"
                         f"Bundle SHA-256: `{metadata['sha256']}`\n\n"
                         "Reusing the original signed bundle; no rebuild or upload.\n")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version", help="Exact Play version name (0.1.7) or version code (100008)")
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    code, name = resolve_version(args.version, int(os.environ["VERSION_OFFSET"]))
    download(code, args.directory, expected_name=name)
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a") as stream:
            stream.write(f"version_code={code}\n")
