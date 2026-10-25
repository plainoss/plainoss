# Main branch ruleset

[`main.json`](main.json) records the repository's active [`main` ruleset](https://github.com/plainoss/plainoss/rules/20981710).

Both checks must succeed before merging into the default branch:

- `Lint, Typecheck & Test`
- `Android Build, Lint & Shared Tests`

Both checks must come from GitHub Actions (integration ID `15368`). The branch must be up to date, and the ruleset has no bypass actors. The Android check covers shared JVM tests, Android lint, debug/test APK compilation, and verification of a release bundle signed with a disposable key.

Keep these job names stable in [`ci.yml`](../workflows/ci.yml). The workflow runs on every pull request, without path filters, so required checks always report a result. Update the ruleset together with any job rename.

GitHub does not apply this JSON file automatically. A repository administrator applies an approved change using:

```bash
gh api --method PUT repos/plainoss/plainoss/rulesets/20981710 \
  --input .github/rulesets/main.json
```

Read the live ruleset first and preserve any newer protections before applying changes. Repository auto-merge is enabled separately in GitHub settings; queued pull requests still wait for both required checks and the other ruleset conditions.
