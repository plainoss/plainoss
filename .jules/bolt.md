## 2026-03-31 - WebXR Render Loop Pre-computed VBOs

**Learning:** Re-generating 3D geometry JS arrays and re-uploading buffer data to the GPU via `gl.bufferData()` on every WebXR animation frame (60-120 FPS) creates significant JS heap garbage collection churn and unnecessary GPU bus transfer overhead. Pre-allocating static VBOs with `gl.STATIC_DRAW` during initialization completely eliminates per-frame heap allocations for static 3D elements like placement reticles and target cursors.

**Action:** Always pre-allocate static WebGL VBOs during engine initialization for any 3D elements whose shape/vertices do not mutate per frame in WebXR/WebGL render loops.
