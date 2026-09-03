## 2025-05-18 - Pre-allocate WebXR 3D Meshes & Use Model Matrix Transforms

**Learning:** Re-generating 3D mesh vertex arrays and calling `gl.bufferData()` every frame in WebXR animation loops (60-90 FPS) introduces severe Garbage Collection (GC) pauses and trigonometric math overhead on mobile devices.
**Action:** Always pre-compute static geometries (torus, unit sphere, reticle dot) once into `STATIC_DRAW` WebGL buffers during initialization and position/scale them per frame using `uModelMatrix` transforms and pre-allocated `Float32Array` matrix buffers.
