# AR Ruler Android releases

Application: `app.plainoss.arruler`; debug installs use `.debug`. Native project: `apps/ar-ruler-mobile`. Android SDK levels are already 36. Gradle Play Publisher 3.12.1 is pinned for the Gradle 8.14.3/AGP 8.11.1 toolchain; GPP 4.1.1 requires Gradle 9.1 and is not compatible with this setup.

## Configured resources

- Play developer account: `schibum`, organisation account, ID `4770520382078237373`.
- [AR Ruler dashboard](https://play.google.com/console/u/0/developers/4770520382078237373/app/4974369210017680707/app-dashboard).
- Internal tester list: `AR Ruler internal`. Add other testers deliberately; existing account-wide lists are not selected.
- Cloud project: `plainoss-releases`, project number `590337448554`.
- Service account: `play-ar-ruler@plainoss-releases.iam.gserviceaccount.com`.
- Federation provider: `projects/590337448554/locations/global/workloadIdentityPools/github/providers/github-actions`.
- GitHub environment: `android-release`, restricted to branch `main`.

This organisation account is outside the new-personal-account 12-tester/14-day rule. Console eligibility, policy requirements and hardware validation still govern production readiness.

## Signing and credentials

Environment secrets:

| Secret                           | Value                          |
| -------------------------------- | ------------------------------ |
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | Base64-encoded upload keystore |
| `ANDROID_KEYSTORE_PASSWORD`      | Keystore password              |
| `ANDROID_KEY_ALIAS`              | Upload key alias               |
| `ANDROID_KEY_PASSWORD`           | Upload key password            |

Environment variables: `ANDROID_UPLOAD_CERTIFICATE_SHA256`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `PLAY_SERVICE_ACCOUNT`, and `PLAY_RELEASE_STATUS` (`draft` initially).

Repository variables: `PLAY_INTERNAL_ENABLED` (`false` initially) and `ANDROID_VERSION_CODE_OFFSET` (`100001`). The enable switch is a repository variable because job conditions are evaluated before environment variables become available.

The setup session generated the upload key and passwords under ignored `.release/ar-ruler/`, with directory permissions 700 and sensitive file permissions 600. **Back up `upload.jks` and `signing.json` to your password manager or another secure location before deleting this checkout.** GitHub secret values cannot be retrieved afterward. The public upload certificate is `upload-certificate.pem`. Never commit these credentials. Google retains the separate app-signing key when Play App Signing is enabled.

No Google service-account key is created. The federation provider requires numeric repository ID `1338224263`, owner ID `318181168`, branch `main`, environment `android-release`, and workflow `plainoss/plainoss/.github/workflows/publish-ar-ruler-internal.yml@refs/heads/main`, for push or manual-dispatch events. Its principal may impersonate only the dedicated service account. That account needs Play read access and testing-track release permission for AR Ruler only; production, finance, admin and other apps are excluded. Store listing changes are managed separately in Console until explicitly granted.

## Bootstrap and enable internal releases

1. Merge the release implementation after its PR checks pass. Leave `PLAY_INTERNAL_ENABLED=false`.
2. The trusted release workflow builds a signed AAB without Google credentials. Download `ar-ruler-release-<run-id>` and inspect `release.json`, `SHA256SUMS` and `verification.txt`.
3. In Play Console, create an internal release, enable Play App Signing with a Google-generated app-signing key, and upload that exact CI AAB. Confirm any signing agreements yourself or explicitly authorise acceptance.
4. Add release notes, resolve Console errors, and roll out to the selected internal testers. The opt-in URL is `https://play.google.com/apps/internaltest/4701751875078975723`; it becomes usable after rollout.
5. Install from Play on an ARCore-supported device. A local/debug installation does not establish that the Play build is installable.
6. Set environment variable `PLAY_RELEASE_STATUS=completed`, then repository variable `PLAY_INTERNAL_ENABLED=true`.
7. Dispatch the workflow again on `main`. It creates the next version and publishes to internal. Re-run that same GitHub run to exercise retry handling. Check Play and test an upgrade from the previous version.

Finish the listing, real device screenshots, privacy-policy URL, Data safety, content rating, audience and other declarations before production. Review ARCore/Google Play Services data practices when completing Data safety; absence of an app analytics SDK does not answer every SDK declaration. Listing text and release notes are versioned under `androidApp/src/main/play/`. The automated upload publishes the bundle and release notes, not listing changes or policy declarations.

## Versions, freshness and retries

Each run uses `versionCode = ANDROID_VERSION_CODE_OFFSET + github.run_number` and `versionName = 0.1.<run-number>`. Local defaults remain code 1/name 0.1.0. Code 100001 was reserved for local bootstrap verification; CI starts above it. Do not change the offset or rename/replace the publishing workflow without reconciling the highest version already used on every Play track. Every externally uploaded version must stay below the next CI version. The maximum accepted code is 2100000000.

One workflow-level concurrency group serializes release builds and publishing. Candidates must equal the current `main` commit before building and uploading; superseded candidates fail. Release artifacts are immutable and retained for 90 days. A rerun downloads its existing artifact and retains its version. An expired artifact is not a reliable retry source: use a new run/version instead.

Before uploading, the retry helper verifies source and checksum, compares all reported bundle/track versions, rejects stale candidates and unexpected collisions, and checks the internal track. An identical already-published bundle is a successful no-op. If the same uploaded bundle exists without its expected internal release, the helper can finish that track update without uploading again. Errors fail the workflow rather than choosing a new version silently. Real API upload/retry behavior must be exercised during bootstrap; unit tests cannot establish account access or Play behavior.

## Checks and artifacts

Run the normal repository checks (`pnpm run format:check`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, `pnpm run android:check`) and `python3 -m unittest discover -s tools/release -p 'test_*.py'`.

`bash tools/release/build.sh <absolute-output-dir>` runs shared JVM tests, release lint and bundle generation. It uses checksum-pinned bundletool 1.18.3 to validate the bundle and manifest. It checks the JAR signature and expected upload certificate, 64-bit native ELF LOAD alignment and RELRO overlap, 16 KB bundle packaging configuration, and `zipalign -P 16` on a bundle-generated universal APK. This is static verification; separately test runtime on a 16 KB emulator/device. The report records native libraries checked.

PR checks generate a disposable signing key and use no repository/environment secrets or OIDC. Real upload signing runs only in the trusted environment, without configuration caching. The publishing job has OIDC permission and downloads the already-verified artifact; it does not rebuild or receive keystore secrets. Never upload `.release/`, a keystore, generated ADC files, or Gradle configuration caches as artifacts.

## Device and production gate

Record the tested version code, source commit, device model, Android version and result for the device checklist in the mobile README: permissions/AR availability, scanning and all measurement modes, point editing, units, history, persistence, sharing, practice canvas, lifecycle/rotation, tracking recovery and known reference measurements. Test Play installation and upgrade while preserving history and preferences. Also test a 16 KB runtime.

Production automation is a separate PR after these checks pass and Console production eligibility is established. It must select an explicit eligible internal version, record testing evidence and the testing start time, respect a configurable testing period and blocker flag, and promote the same uploaded version without rebuilding. Keep managed publishing off if approval should lead directly to publication. Report submission, review and live availability distinctly. Do not enable a production schedule as part of initial setup.

## Pause and recovery

- Set repository variable `PLAY_INTERNAL_ENABLED=false` to prevent new upload jobs. Signed builds continue. Cancel an already-running upload separately; a pause does not withdraw a submitted release.
- Disable the workflow if signed builds also need to stop. Disabling the federation provider revokes new Google token exchanges; already-issued credentials may remain valid until expiry.
- For a failed upload, inspect the failed step and Play state before rerunning the same run. Never use GPP automatic version-code resolution to hide a collision.
- For a bad internal release, pause automation and prepare a fix with a higher version code. Android does not normally downgrade to a lower version.
- Before production automation, document and exercise halting an active staged rollout in Console. Halting prevents further rollout; it does not uninstall the version from users who already received it. Fully rolled-out releases generally require a higher-version fix.

References: [GPP](https://github.com/Triple-T/gradle-play-publisher/tree/3.12.1), [Google auth action](https://github.com/google-github-actions/auth), [deployment-pipeline federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [16 KB verification](https://developer.android.com/guide/practices/page-sizes), [personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
