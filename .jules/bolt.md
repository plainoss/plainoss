## 2025-05-18 - Eliminate Per-Frame Allocations in WebXR Render Loop

**Learning:** Generating raw 3D mesh arrays and short-lived Point3D objects inside a WebXR render loop (60-120 FPS) creates significant garbage collection pressure, causing frame drops (jank) on mobile WebXR devices. Pre-uploading unit geometry VBOs and reusing typed arrays (`Float32Array`) with `bufferSubData` and `uModelMatrix` transforms completely removes GC allocations during rendering.
**Action:** Always pre-buffer static unit geometry and reuse typed arrays for dynamic buffers when building WebXR/WebGL renderers.
