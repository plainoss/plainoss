## 2025-05-18 - Pre-allocate buffers and pre-compute static meshes in WebXR render loops

**Learning:** In WebXR 60/90 FPS render loops, creating temporary JavaScript arrays or typed array instances (`new Float32Array(...)`) for 3D meshes (spheres, torus, cylinder tubes) per frame triggers frequent Garbage Collection (GC) pauses and micro-stutters in AR/VR headsets. Pre-computing unit meshes once and re-using static `Float32Array` buffers with `uModelMatrix` translations eliminates frame time spikes entirely.
**Action:** Always pre-compute static WebGL geometry during initialization and pre-allocate reusable typed buffers for dynamic vertex data in high-frequency rendering loops.
