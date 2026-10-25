# AR Ruler Mobile

Native Android AR Ruler, built with Kotlin Multiplatform. The camera opens as soon as camera permission and Google Play Services for AR are available. Measurement math and state are shared Kotlin; Android owns the Compose Material 3 interface, ARCore session, camera rendering, and local storage.

The [web app](../web-ar-ruler) uses the TypeScript engine in `packages/core`. This app's Kotlin engine preserves equivalent geometry, units, and measurement behavior, with common Kotlin tests covering the same reference cases. Android and future iOS platform adapters share the Kotlin core.

## Build and install

Prerequisites:

- JDK 17 or 21. Gradle 8.14.3 does not run on JDK 25; all app bytecode targets Java 17.
- Android SDK Platform 36 and current Android SDK command-line tools. Accept SDK licenses through Android Studio's SDK Manager or `sdkmanager --licenses`.
- A current Android Studio release for IDE support, or the checked-in Gradle wrapper for command-line builds. No globally installed Gradle is required.

Open `apps/ar-ruler-mobile` as a project in Android Studio. Point `ANDROID_HOME` at the Android SDK, or create an untracked `local.properties` containing `sdk.dir=/absolute/path/to/Android/sdk`. Select JDK 17 or 21 as the Gradle JDK.

From the repository root:

The `pnpm` Android shortcuts automatically find a compatible installed JDK 17 or 21 and an Android SDK in standard locations. A compatible explicit `JAVA_HOME` is respected. Direct `./gradlew` commands still need a compatible JDK selected and an SDK configured through the environment or `local.properties`.

```bash
# Shared Kotlin tests, Android lint, and installable debug APK
pnpm run android:check

# Build only
pnpm run android:build

# Install on an attached device with USB debugging enabled
pnpm run android:install
```

The native project also works without Node or pnpm:

```bash
cd apps/ar-ruler-mobile
./gradlew :shared:jvmTest :androidApp:lintDebug :androidApp:assembleDebug
./gradlew :androidApp:installDebug
```

On Windows, use `gradlew.bat` for the equivalent commands. The debug APK is written to `androidApp/build/outputs/apk/debug/androidApp-debug.apk`. The release application ID is `app.plainoss.arruler`; debug builds use `app.plainoss.arruler.debug` so they can coexist with a release; Android 8.0 (API 26) or newer is required.

The root pnpm/Turbo commands continue to build the web app and TypeScript packages. Native compilation runs separately. On every pull request and push to `main`, CI runs the shared tests, Android lint, and debug build, then uploads `ar-ruler-mobile-debug-apk` for 14 days. Open the workflow run in GitHub Actions, download that artifact from **Artifacts**, and extract `androidApp-debug.apk` to install it. The **Build Mobile APK Artifact** workflow also runs on `mobile-*` tags or manual dispatch and retains its APK for 30 days. These APKs use Android's debug signing; store signing and publishing are not configured.

## Measurement workflow

1. Launch the app and allow camera access. If prompted, install or update Google Play Services for AR, then return to the app.
2. Slowly move the phone over a well-lit, textured surface until the aim indicator finds a point.
3. Choose Distance, Path, Area, or Angle. Aim at each point and press **+** to place it. Distance takes two points; Path connects a series of points; Angle uses three points with the second point as its vertex. For Area, place at least three corners in order on one flat surface, then tap the first point or **Close area**. A translucent fill shows the polygon. After closing, **+** starts a new area.
4. In every mode, tap a placed point or its number in **Move point** to select it, including points outside the camera view. Aim at its new position and tap **Move**. Tap **Cancel**, the selected number, or Back to cancel. In the practice canvas, select a point and tap its new grid position. Moving a corner keeps a closed area closed. Undo reopens a closed area before removing corners; otherwise it removes the last point. Clear starts over.
5. Change units without remeasuring. Save a completed measurement to local history, copy its value, or send it through the Android sharesheet.

The Practice canvas is available from settings and recovery screens, including on devices without AR support. Tap its grid to add points; optionally snap to a 0.5 m grid, or load one of four samples: a room, a desk, a 3–4–5 triangle, or a roof slope. Practice measurements are labeled separately from camera measurements.

ARCore measurements are estimates. Surface texture, lighting, motion, tracking quality, and distance affect accuracy. Moving the app to the background releases the camera; returning resumes the AR workflow.

| Capability                              | Android implementation                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Camera on launch                        | Starts automatically after required permission and AR service checks                     |
| World-space measurement                 | Native ARCore hit tests, anchored points, live previews, and projected measurement lines |
| Measurement modes                       | Distance, connected path length, planar polygon area, and three-point angle              |
| Editing                                 | Reposition endpoints, undo the last point, or clear the measurement                      |
| Units                                   | Meters, centimeters, millimeters, inches, feet, yards; degrees or radians for angles     |
| Local history                           | Latest 200 saves, delete individual entries, confirm before clearing all                 |
| Copy and sharing                        | Copy/share a result or the complete saved history through Android                        |
| Preferences                             | Distance and angle unit selections persist between launches                              |
| Practice canvas                         | Clearly labeled sample mode with four presets and optional 0.5 m snapping                |
| Platform interface                      | Jetpack Compose with Material 3, system insets, and responsive portrait/landscape layout |
| Unsupported device / missing permission | Explicit recovery and availability states                                                |
| iOS                                     | Planned; no iOS app or ARKit adapter yet                                                 |

## Modules and iOS extension

```text
ar-ruler-mobile/
├── androidApp/                  # Android app: Compose, ARCore, permissions, storage
├── shared/
│   └── src/
│       ├── commonMain/          # Portable geometry, units, measurement state
│       └── commonTest/          # Pure Kotlin tests, run using the host JVM target
├── gradle/libs.versions.toml    # Pinned dependency and plugin versions
└── gradlew                     # Checked-in wrapper with distribution checksum
```

The shared module uses the Android Kotlin Multiplatform library plugin, plus a JVM target for tests. It has no Android or ARCore dependencies in common code. Android UI and camera APIs stay out of that module.

When adding iOS, add Apple targets to `shared`, expose a framework to an iOS application, and implement an ARKit adapter with the same point-placement and measurement-state contracts. Keep camera permissions, session lifecycle, and platform interface behavior native. Apple targets are deliberately deferred so Android development and CI do not require Xcode.

Build dependencies are pinned to Kotlin 2.2.20, Android Gradle Plugin 8.11.1, Gradle 8.14.3, Compose BOM 2025.10.00, and ARCore 1.57.0. See the [Kotlin compatibility table](https://kotlinlang.org/docs/gradle-configure-project.html), [Android KMP plugin guide](https://developer.android.com/kotlin/multiplatform/plugin), and [ARCore Android documentation](https://developers.google.com/ar/develop/java).

## Device verification

Shared JVM tests and Android compilation cannot verify camera tracking or physical measurement accuracy. Before release, test on a [supported physical ARCore device](https://developers.google.com/ar/devices):

- First launch, granted permission, denied permission, and permanent denial followed by Settings recovery.
- Missing/outdated Google Play Services for AR and an unsupported Android device.
- Scanning, all four measurement modes, point placement, endpoint editing, undo/clear, and unit changes.
- Saved history, restart persistence, individual delete, clear confirmation, copy, and Android sharing.
- Practice presets, grid snapping, and switching between Practice and the camera.
- Home/app switching, screen rotation, screen lock/unlock, camera contention, and return from Settings.
- Dark/bright scenes, low-texture surfaces, tracking loss and recovery, and known reference lengths.
- Small and large displays, gesture navigation, large text, and TalkBack labels.

Initial installation or an AR service update may need network access. Measurement runs locally after the required AR service is installed.
