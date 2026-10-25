#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17 or 21}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK}"
: "${ANDROID_SERIAL:?Select an emulator using ANDROID_SERIAL (for example emulator-5554)}"
adb="$ANDROID_HOME/platform-tools/adb"
[[ "$("$adb" shell getprop ro.kernel.qemu | tr -d '\r')" == 1 ]] || {
  echo 'Store-artwork fixtures run only on an emulator.' >&2
  exit 1
}
(
  cd "$root/apps/ar-ruler-mobile"
  ./gradlew --no-configuration-cache :androidApp:assembleDebug :androidApp:assembleDebugAndroidTest
)
"$adb" install -r "$root/apps/ar-ruler-mobile/androidApp/build/outputs/apk/debug/androidApp-debug.apk"
"$adb" install -r "$root/apps/ar-ruler-mobile/androidApp/build/outputs/apk/androidTest/debug/androidApp-debug-androidTest.apk"
result="$("$adb" shell am instrument -w \
  -e class app.plainoss.arruler.ui.StoreArtworkCaptureTest -e storeArtwork true \
  app.plainoss.arruler.debug.test/androidx.test.runner.AndroidJUnitRunner)"
printf '%s\n' "$result"
[[ "$result" == *'OK (1 test)'* ]] || exit 1
mkdir -p "$root/tools/store-artwork/screenshots/native"
"$adb" pull /sdcard/Android/data/app.plainoss.arruler.debug/files/store-artwork/. \
  "$root/tools/store-artwork/screenshots/native/"
