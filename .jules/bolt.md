## 2025-05-18 - Zero-Allocation WebXR Render Loops

**Learning:** Re-generating mesh vertex arrays (e.g. torus, sphere, cylinder) and calling `new Float32Array()` inside high-frequency WebXR frame callbacks (`requestAnimationFrame` at 60–120 FPS) triggers frequent garbage collection pauses, causing frame drops in AR rendering.

**Action:** Pre-build static VBOs (`gl.STATIC_DRAW`) during engine initialization for recurring geometries like reticle rings and handles. Transform handles in world space using `uModelMatrix` uniforms and reusable matrix float buffers. For dynamic meshes like cylinders or point clouds, write directly into pre-allocated `Float32Array` instance buffers.
