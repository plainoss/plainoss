# AR Ruler privacy policy

Effective date: 25 October 2026

This policy covers the PlainOSS Android app **AR Ruler**, application ID `app.plainoss.arruler`, published by **schibum**.

## Camera and augmented reality

AR Ruler requests camera access to estimate measurements using augmented reality. When you tap Save, the app saves a still camera image with the measurement overlay in private storage on your device. It does not record videos or send images to PlainOSS. You can revoke camera permission in Android settings.

Camera measurements use **Google Play Services for AR (ARCore)**, provided by Google. Google's service has its own collection and processing practices, governed by the [Google Privacy Policy](https://policies.google.com/privacy). See [how Google Play Services for AR handles data](https://support.google.com/ar?p=how-google-play-services-for-ar-handles-your-data). This app does not enable ARCore Cloud Anchors or the Geospatial API.

## Saved measurements and preferences

The app stores your selected units, camera-permission prompt state, your history limit, and saved measurements (20 by default, configurable to 50, 100 or 200) in private app storage on your device. Measurement history includes the measurement type, points, result, units, save time, editable name and a photo with the measurement overlay. Older measurements saved before photo support have no photo.

You can delete individual saved measurements or clear all saved history in the app; both actions also remove the associated photos. At your configured history limit, saving another measurement removes the oldest record and its photo. Lowering the limit asks for confirmation before deleting older records. Clearing Android app storage or uninstalling the app removes its local data. The app disables Android cloud backup and excludes its preferences and saved photos from Android device transfer. Photos are stored in Android’s no-backup app directory.

## Copying and sharing

If you choose Copy, the selected result is placed on the Android clipboard. If you choose Share, Android sends the measurement text to the app or recipient you select. The receiving app, clipboard and operating system are subject to their own privacy practices.

## Accounts, advertising and analytics

AR Ruler does not require an app account. PlainOSS includes no advertising or analytics SDK and operates no server that collects this app's measurements. Google Play, Google Play Services for AR, Android, and services you choose for sharing may process data independently of PlainOSS.

## Contact and updates

Contact the PlainOSS maintainers at [help@plainoss.app](mailto:help@plainoss.app) or through the [project issue tracker](https://github.com/plainoss/plainoss/issues). Do not post private measurements or other sensitive information in public issues. Changes to this policy will be published at this URL with an updated effective date.
