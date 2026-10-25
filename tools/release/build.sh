#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17 or 21}"
: "${ANDROID_HOME:?Set ANDROID_HOME}"
: "${ANDROID_VERSION_CODE:?Set ANDROID_VERSION_CODE}"
: "${ANDROID_VERSION_NAME:?Set ANDROID_VERSION_NAME}"
: "${ANDROID_UPLOAD_CERTIFICATE_SHA256:?Set the expected upload certificate SHA-256}"
output="${1:?Usage: bash tools/release/build.sh /absolute/output/directory}"
mkdir -p "$output"
output="$(cd "$output" && pwd)"
tool="$output/bundletool.jar"
curl --fail --location --silent --show-error --retry 3 \
  https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar -o "$tool"
python3 - "$tool" <<'PY'
import hashlib, pathlib, sys
actual = hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest()
if actual != 'a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29':
    raise SystemExit('bundletool checksum mismatch')
PY
(
  cd "$root/apps/ar-ruler-mobile"
  ./gradlew --no-daemon --no-configuration-cache \
    :shared:jvmTest :androidApp:lintRelease :androidApp:bundleRelease
)
bundle="$root/apps/ar-ruler-mobile/androidApp/build/outputs/bundle/release/androidApp-release.aab"
cp "$bundle" "$output/androidApp-release.aab"
python3 "$root/tools/release/verify-bundle.py" \
  --bundle "$output/androidApp-release.aab" --bundletool "$tool" \
  --certificate-sha256 "$ANDROID_UPLOAD_CERTIFICATE_SHA256" \
  --version-code "$ANDROID_VERSION_CODE" --version-name "$ANDROID_VERSION_NAME" \
  --commit "$(git -C "$root" rev-parse HEAD)" --output "$output"
symbols="$root/apps/ar-ruler-mobile/androidApp/build/outputs/native-debug-symbols/release/native-debug-symbols.zip"
if [[ -f "$symbols" ]]; then cp "$symbols" "$output/"; fi
rm "$tool"
