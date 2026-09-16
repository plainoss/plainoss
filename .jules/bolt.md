## 2025-02-18 - Pre-compute WebXR Static Geometry & Use Model Matrix Translations

**Learning:** Generating 3D mesh arrays (`createTorusMesh`, `createSphereMesh`) on every animation frame in WebGL/WebXR render loops causes massive GC pressure (~5,000+ JS array allocations/sec) and CPU overhead (~158 μs/frame).
**Action:** Pre-compute static geometry into typed `Float32Array` buffers during engine initialization and set vertex positions via `uModelMatrix` translation uniform instead of re-generating vertices every frame.
