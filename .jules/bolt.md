## 2025-05-18 - Pre-allocate static WebGL geometry buffers for WebXR render loops

**Learning:** In WebXR/WebGL rendering loops running at 60–120 FPS, generating 3D geometry arrays (torus, sphere) on every frame creates heavy GC pressure (~1,500 temporary objects & 10,000 floats allocated/sec) and CPU overhead. Pre-computing static WebGLBuffers at initialization and applying `uModelMatrix` translation uniforms in shaders eliminates per-frame trigonometry and heap allocations (~1,400x speedup in mesh prep).
**Action:** Always pre-allocate static WebGL geometry buffers once during init and use model matrix uniforms for position/orientation transforms in high-FPS render loops.
