## 2025-02-18 - WebXR Render Loop Geometry Allocation

**Learning:** In WebXR high-frequency (60-120 FPS) render loops, recalculating static 3D mesh geometry (e.g. reticle torus, targeting dot, handle spheres) and re-uploading dynamic vertex buffers via `gl.bufferData` on every frame causes heavy CPU overhead, GPU bandwidth waste, and GC-induced frame drops.
**Action:** Pre-generate static 3D geometries into dedicated GPU Vertex Buffer Objects (VBOs) using `gl.STATIC_DRAW` during engine initialization. At render time, bind the static buffers and pass target world coordinates via translation/model matrices (`uModelMatrix`).
