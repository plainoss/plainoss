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
- Production identity: `play-ar-ruler-production@plainoss-releases.iam.gserviceaccount.com`, isolated in federation pool `github-production`, provider `github-actions`.
- GitHub environment: `android-production`, restricted to branch `main`, with no signing secrets or required reviewer.

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

Repository variables: `PLAY_INTERNAL_ENABLED` (`false` initially), `PLAY_PRODUCTION_ENABLED` (`false` until production setup is ready) and `ANDROID_VERSION_CODE_OFFSET` (`100001`). The internal enable switch is a repository variable because job conditions are evaluated before environment variables become available.

The setup session generated the upload key and passwords under ignored `.release/ar-ruler/`, with directory permissions 700 and sensitive file permissions 600. **Back up `upload.jks` and `signing.json` to your password manager or another secure location before deleting this checkout.** GitHub secret values cannot be retrieved afterward. The public upload certificate is `upload-certificate.pem`. Never commit these credentials. Google retains the separate app-signing key when Play App Signing is enabled.

The first CI-built release (100002) was uploaded through Console and installed successfully on a physical device by the maintainer. Keyless CI then published version 100003 successfully. Automatic internal publishing is enabled; production remains disabled.

No Google service-account key is created. The federation provider requires numeric repository ID `1338224263`, owner ID `318181168`, branch `main`, environment `android-release`, and workflow `plainoss/plainoss/.github/workflows/publish-ar-ruler-internal.yml@refs/heads/main`, for push or manual-dispatch events. Its principal may impersonate only the dedicated service account. That account needs Play read access and testing-track release permission for AR Ruler only; production, finance, admin and other apps are excluded. Store listing changes are managed separately in Console until explicitly granted.

## Bootstrap and enable internal releases

1. Merge the release implementation after its PR checks pass. Leave `PLAY_INTERNAL_ENABLED=false`.
2. The trusted release workflow builds a signed AAB without Google credentials. Download `ar-ruler-release-<run-id>` and inspect `release.json`, `SHA256SUMS` and `verification.txt`.
3. In Play Console, create an internal release, enable Play App Signing with a Google-generated app-signing key, and upload that exact CI AAB. Confirm any signing agreements yourself or explicitly authorise acceptance.
4. Add release notes, resolve Console errors, and roll out to the selected internal testers. The opt-in URL is `https://play.google.com/apps/internaltest/4701751875078975723`; it becomes usable after rollout.
5. Install from Play on an ARCore-supported device. A local/debug installation does not establish that the Play build is installable.
6. Set environment variable `PLAY_RELEASE_STATUS=completed`, then repository variable `PLAY_INTERNAL_ENABLED=true`.
7. Dispatch the workflow again on `main`. It creates the next version and publishes to internal. Re-run that same GitHub run to exercise retry handling. Check Play and test an upgrade from the previous version.

Finish the listing, real device screenshots, Data safety, content rating, audience and other declarations before production. The checked-in [privacy policy](ar-ruler-privacy.md) will be available after merge at `https://github.com/plainoss/plainoss/blob/main/docs/ar-ruler-privacy.md`; use that URL in Console. Settings includes the ARCore disclosure and links to the app and Google privacy policies. Review ARCore/Google Play Services data practices when completing Data safety; absence of an app analytics SDK does not answer every SDK declaration. Listing text and release notes are versioned under `androidApp/src/main/play/`. The automated upload publishes the bundle and release notes, not listing changes or policy declarations.

## Versions, freshness and retries

Each run uses `versionCode = ANDROID_VERSION_CODE_OFFSET + github.run_number` and `versionName = 0.1.<run-number>`. Local defaults remain code 1/name 0.1.0. Code 100001 was reserved for local bootstrap verification; CI starts above it. Do not change the offset or rename/replace the publishing workflow without reconciling the highest version already used on every Play track. Every externally uploaded version must stay below the next CI version. The maximum accepted code is 2100000000.

One workflow-level concurrency group serializes release builds and publishing. Candidates must equal the current `main` commit before building and uploading; superseded candidates fail. Release artifacts are immutable and retained for 90 days. A rerun downloads its existing artifact and retains its version. An expired artifact is not a reliable retry source: use a new run/version instead.

Before uploading, the retry helper verifies source and checksum, compares all reported bundle/track versions, rejects stale candidates and unexpected collisions, and checks the internal track. An identical already-published bundle is a successful no-op. If the same uploaded bundle exists without its expected internal release, the helper can finish that track update without uploading again. Errors fail the workflow rather than choosing a new version silently. Real API upload/retry behavior must be exercised during bootstrap; unit tests cannot establish account access or Play behavior.

## Checks and artifacts

Run the normal repository checks (`pnpm run format:check`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, `pnpm run android:check`) and `python3 -m unittest discover -s tools/release -p 'test_*.py'`.

`bash tools/release/build.sh <absolute-output-dir>` runs shared JVM tests, release lint and bundle generation. It uses checksum-pinned bundletool 1.18.3 to validate the bundle and manifest. It checks the JAR signature and expected upload certificate, 64-bit native ELF LOAD alignment and RELRO overlap, 16 KB bundle packaging configuration, and `zipalign -P 16` on a bundle-generated universal APK. This is static verification; separately test runtime on a 16 KB emulator/device. The report records native libraries checked.

PR checks generate a disposable signing key and use no repository/environment secrets or OIDC. Real upload signing runs only in the trusted environment, without configuration caching. The publishing job has OIDC permission and downloads the already-verified artifact; it does not rebuild or receive keystore secrets. Never upload `.release/`, a keystore, generated ADC files, or Gradle configuration caches as artifacts.

## Publish to production: one device check, one button

Merging app changes continues to publish only to internal testing. Production has no push trigger, schedule, candidate PR or mandatory waiting period.

1. Install the intended version from Play internal testing and check its version code. Check permissions/AR availability, scanning and measurement modes, point editing, units, history/persistence, sharing, lifecycle/rotation, tracking recovery and a known reference measurement. Test upgrades with saved history and preferences; also establish 16 KB runtime compatibility before the first public release and after relevant native changes.
2. Open [Publish AR Ruler to Production](https://github.com/plainoss/plainoss/actions/workflows/publish-ar-ruler-production.yml), choose **Run workflow** on `main`, and enter that exact **version code**. Running this workflow confirms that you completed device checks for that version. There is no separate testing form.
3. Read the run summary and check [Publishing overview](https://play.google.com/console/u/0/developers/4770520382078237373/app/4974369210017680707/publishing). Google review still determines availability. With managed publishing off, approval can lead directly to public availability in the configured countries.

The workflow resolves the version back to its successful internal CI run using the configured version offset. It requires a successful `publish` job, downloads that run's immutable artifact, checks app/version/commit/checksum and upload-certificate metadata, and compares its checksum with the bundle already in Play. Expired or missing artifacts fail; build and test a new version instead. Notes come from the selected source commit's `internal.txt`, so write those notes for public users before merging. The workflow never rebuilds or uploads an AAB.

Promotion uses the existing version on `production` with `status=completed` (full rollout). The first public release cannot use a staged rollout. Newer internal builds do not invalidate your tested candidate, but newer production versions, draft production releases, or staged/halted production rollouts block promotion. All release workflows share one concurrency group. Re-running an already-committed candidate is a no-op; after a timeout, inspect Console and rerun the same workflow run. Existing Google reviews are not cancelled: a new submission fails if changes are already in review. Do not submit unrelated Console edits at the same time; Play review submissions can include pending app changes.

Internal publishing also checks for an active production review before uploading or recovering a track update. While Google reviews production, signed builds still run, but new internal publishing fails with instructions to wait. Once review finishes, dispatch a fresh internal run from current `main`; an old run may fail the existing source-freshness check. An already-published internal retry remains a no-op.

The summary records the version, original CI run, commit, bundle checksum, triggering developer and observed Play lifecycle. A committed track with `status=completed` does **not** prove approval or public availability. If Play reports a rejection, changes not sent for review, or approval awaiting publication, resolve that state in Console; retrying does not force a resubmission or override managed publishing.

### One-time production configuration

The `android-production` environment uses `ANDROID_UPLOAD_CERTIFICATE_SHA256`, `GCP_WORKLOAD_IDENTITY_PROVIDER` and `PLAY_SERVICE_ACCOUNT`. Its provider is `projects/590337448554/locations/global/workloadIdentityPools/github-production/providers/github-actions`. It accepts only repository ID `1338224263`, owner ID `318181168`, `main`, environment `android-production`, and manual dispatch of `plainoss/plainoss/.github/workflows/publish-ar-ruler-production.yml@refs/heads/main`. Only this isolated pool may impersonate the production service account. The internal identity retains testing-only access; neither environment shares a Google service-account key.

Before enabling the button:

1. In Play Console **Users and permissions**, add the production service account with **View app information (read-only)** and **Release to production, exclude devices, and use Play App Signing**, scoped to **AR Ruler only**. Play also automatically includes app-quality read access, policy declarations and deep-link management with these permissions. Do not grant account-wide access, admin, finance, testing release or store-listing management permissions.
2. Complete the required app-dashboard tasks, policy declarations and listing, and select production countries/regions. Confirm production eligibility and keep managed publishing off. These Console steps are not automated by the release workflow.
3. After merging the workflow, set repository variable `PLAY_PRODUCTION_ENABLED=true`. The switch starts paused. No app is submitted simply by enabling it; you must manually run the workflow with a tested version.

The GitHub environment has no reviewer requirement: the manual **Run workflow** action is the release decision. The workflow and unit tests can be validated without submitting an app; only the first real production run can establish Google access and review behavior end to end.

The production environment, isolated federation provider, service account and app-scoped Play permissions were configured on 25 October 2026. All 178 available country/region entries, including Rest of world, were selected and saved for production. The country changes are pending review with the first release. Enable `PLAY_PRODUCTION_ENABLED` after merging this workflow; managed publishing is off. Setup does not submit a production release: the developer must still test and explicitly select the version to publish.

## Pause and recovery

- Set repository variable `PLAY_INTERNAL_ENABLED=false` to prevent new upload jobs. Signed builds continue. Cancel an already-running upload separately; a pause does not withdraw a submitted release.
- Set repository variable `PLAY_PRODUCTION_ENABLED=false` to block new production submissions. The switch is checked at job start; cancel an already-running production job separately. It does not withdraw changes already submitted to Google. Re-enable it only after resolving the issue.
- Disable the workflow if signed builds also need to stop. Disabling the federation provider revokes new Google token exchanges; already-issued credentials may remain valid until expiry.
- For a failed upload, inspect the failed step and Play state before rerunning the same run. Never use GPP automatic version-code resolution to hide a collision.
- For a bad internal release, pause automation and prepare a fix with a higher version code. Android does not normally downgrade to a lower version.
- For a bad public release, pause production publishing and inspect **Test and release → Production** in Console. Halt the release if Play offers that action; it cannot remove the version from devices that already received it. A fully rolled-out release can only be halted when Play has an eligible previous release to serve, so the first public release needs a higher-version fix. Build, internally test and publish that fix through the same button.

References: [GPP](https://github.com/Triple-T/gradle-play-publisher/tree/3.12.1), [Google auth action](https://github.com/google-github-actions/auth), [deployment-pipeline federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [16 KB verification](https://developer.android.com/guide/practices/page-sizes), [personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465), [production commit and review behavior](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit), [release lifecycle](https://developers.google.com/android-publisher/api-ref/rest/v3/applications.tracks.releases), [staged rollout and first-release restrictions](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en).
