# AR Ruler store artwork

Run `python3 tools/store-artwork/render.py` with `rsvg-convert` (librsvg) installed to export the Play icon, feature graphic and screenshots into `apps/ar-ruler-mobile/androidApp/src/main/play/listings/en-US/graphics/`.

The icon is exported directly from the Android vector drawable. The feature graphic extends that app's dark-green/lime visual identity. The maintainer supplied the genuine camera capture showing a distance of 0.91 metres. Exports include the complete capture and a clearly framed detail of its measurement controls, formatted to Play's aspect ratios. They do not fabricate measurements or camera scenes. The source capture is stored without private image metadata. Add further real measurements in other modes before the public launch.

Suggested accessible descriptions:

- Icon: “Lime ruler on a dark green background.”
- Feature graphic: “AR Ruler: distance, path, area and angle measurements, with a four-point area diagram.”
- `01-camera-distance.png`: “Camera measurement of 0.91 metres between two points near a window, with controls for editing and saving.”
- `02-measurement-controls.png`: “Detail of the same genuine capture showing point selection, a 0.91-metre result, Save, Undo and Clear.”

Public support address: `help@plainoss.app` (verified by the maintainer during setup).
