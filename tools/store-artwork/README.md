# AR Ruler store artwork

Run `python3 tools/store-artwork/render.py` with `rsvg-convert` (librsvg) installed to export the Play icon, feature graphic and screenshots into `apps/ar-ruler-mobile/androidApp/src/main/play/listings/en-US/graphics/`.

The icon is exported directly from the Android vector drawable so the store and installed app share the same mark. The feature graphic and four 1440 × 2560 store cards use the app's dark-green/lime identity, consistent headlines and generous margins. The maintainer supplied the genuine Android camera capture showing a distance of 0.91 metres. Its camera scene and measurement are preserved in the first card, with the current controls presented separately below it. No camera scenes or tracked measurements are generated.

The remaining interface images are actual Pixel 8/API 36 emulator renders of the production `MetricCard`, `CaptureRow`, `HistorySheet` and `MeasurementUnitsSheet` composables. Fixtures are labelled as examples in both history and the artwork. These are component previews, not claims that a live AR session ran on the emulator. The renderer never draws imitation Android controls. Capture source images are stored without private image metadata.

To refresh the native captures on an already-running emulator:

```bash
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
export ANDROID_SERIAL=emulator-5554
bash tools/store-artwork/capture-native.sh
python3 tools/store-artwork/render.py
```

The capture script refuses physical devices. It installs the debug app and instrumented capture harness on the selected emulator. The capture test is opt-in and otherwise skipped during normal device tests. The unit picker is shared with the app, so its preview stays in sync. Keep real device AR validation separate; the capture harness establishes neither tracking nor measurement accuracy.

The Console listing and source descriptions must be updated together. Publishing only the AAB does not upload the store listing. The Advertising ID declaration was completed as **No** on 25 October 2026 after checking the app code, SDK dependencies and merged release manifest; the app declares no `com.google.android.gms.permission.AD_ID` permission. Console declarations and listing changes remain pending the first release review.

The four store cards and updated feature graphic are saved in Console in numeric card order and declared as created or edited using AI because their promotional layouts and captions were composed with AI assistance. The camera image is supplied by the maintainer and the component images are native emulator captures. The existing app icon is unchanged. Shared sheet headings and bottom-sheet content explicitly use the light `onSurface` color (14.9:1 contrast against `Panel`), including when an enclosing composition supplies black text.

Suggested accessible descriptions:

- Icon: “Lime ruler on a dark green background.”
- Feature graphic: “AR Ruler: measure your space, with a four-point area illustration.”
- `01-camera-distance.png`: “Genuine Android camera measurement of 0.91 metres near a window, followed by a separate current-controls preview.”
- `02-measurement-modes.png`: “Current Android area controls with a labelled example of 12 square metres, mode selection and individual point editing.”
- `03-local-history.png`: “Local history with clearly labelled example distance, area and angle measurements, plus copy and share controls.”
- `04-measurement-units.png`: “The Android unit picker offers meters, centimeters, millimeters, inches, feet and yards.”

Public support address: `help@plainoss.app` (verified by the maintainer during setup).
