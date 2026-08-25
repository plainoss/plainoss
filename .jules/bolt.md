## 2025-05-18 - Pre-compute Static Geometry Buffers in WebGL/WebXR Render Loops
**Learning:** Generating JavaScript arrays and allocating new TypedArrays (like `Float32Array`) inside 60-120 FPS WebGL/WebXR requestAnimationFrame callbacks causes significant garbage collection pauses and frame drops.
**Action:** Always pre-compute static 3D geometry mesh buffers (like reticles, cursors, or static primitives) in constructor/init methods and pass pre-allocated `Float32Array` instances directly to `gl.bufferData`.
