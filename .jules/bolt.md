## 2025-10-03 - WebXR Per-Frame Mesh Allocations & Canvas Projection Layout Queries

**Learning:** In WebXR and Canvas 3D render loops running at 60-120 FPS, recreating static local 3D mesh geometry (torus/sphere arrays) and calling `canvas.getBoundingClientRect()` inside point projection routines creates significant heap allocation churn and forced DOM layout overhead.
**Action:** Always pre-compute static local-space WebGL geometry buffers once during shader initialization and cache canvas dimensions and camera trigonometric values during 3D projection passes.
