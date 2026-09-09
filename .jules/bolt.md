## 2025-05-18 - Precompute WebGL Meshes & Utilize Model Matrices for WebXR Render Loops

**Learning:** In real-time WebXR render loops (60-120 FPS across multiple camera viewports), recalculating 3D geometry meshes (torus rings, spheres) on CPU and uploading them to WebGL via `gl.bufferData` causes massive CPU trigonometric overhead (`Math.sin`/`Math.cos`), JS array heap allocations, and GPU bandwidth bottlenecks.
**Action:** Precompute static geometry (such as unit spheres and reticle rings) once at initialization into static GPU WebGL buffers, transform them using `uModelMatrix` uniforms (scaling & translation), and write dynamic geometry directly into reused TypedArrays (`Float32Array`) to eliminate per-frame GC pressure.
