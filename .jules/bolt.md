## 2026-03-05 - Pre-project 3D Points in Canvas Rendering Loop

**Learning:** Re-projecting 3D points to 2D screen coordinates (`project(p)`) multiple times within the same render pass (e.g. across `renderPolygon`, `renderLines`, and `renderPoints`) causes unnecessary matrix and trigonometric operations per frame.

**Action:** Always pre-compute and store projected 2D coordinates in an array once per frame pass and pass them down into sub-render methods.
