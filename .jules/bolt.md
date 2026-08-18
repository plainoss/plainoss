## 2025-08-18 - WebXR Render Loop Zero-Allocation Optimization

**Learning:** Re-generating WebGL torus/sphere 3D meshes and constructing temporary array buffers inside WebXR animation frame loops (60-90 FPS) causes garbage collection micro-stutters. Pre-computing static meshes as `Float32Array` instances and using a pre-allocated reusable buffer for dynamic surface grid dots completely removes GC thrashing and frame drops during AR surface scanning.
**Action:** Always pre-compute static WebGL geometry and reuse typed array buffers for per-frame dynamic point/vertex generation in high-frequency render engines.
