## 2025-05-18 - WebGL Static Geometry Buffering in WebXR Render Loop

**Learning:** Generating WebGL mesh arrays (`createTorusMesh`, `createSphereMesh`) and calling `gl.bufferData(..., DYNAMIC_DRAW)` on every WebXR frame (60-120 FPS) creates significant GC pressure and unnecessary trigonometric CPU overhead.
**Action:** Pre-compute static mesh WebGL buffers once during engine initialization with `gl.STATIC_DRAW`, and use the `uModelMatrix` shader uniform for object translations in hot frame rendering loops.
