## 2025-08-28 - Zero-GC Mesh Generation in WebXR Render Loops

**Learning:** Allocating raw JS arrays (`number[]`) and intermediate `{x, y, z}` objects inside 60-90 FPS WebXR render loops creates GC pressure and micro-stutters. Pre-allocating `Float32Array` buffers on the instance level and mutating them via array index offsets avoids object instantiation completely while remaining safe for WebGL synchronous buffer uploads (`gl.bufferData`).

**Action:** Whenever generating dynamic WebGL geometry meshes or particle grids on every frame, pre-allocate instance-level `Float32Array` buffers and return `.subarray(0, offset)` to pass directly to WebGL.
