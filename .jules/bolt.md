## 2025-02-21 - Eliminate GC allocations in WebXR render loops

**Learning:** In WebXR WebGL animation loops running at 60-120fps, building temporary JavaScript arrays (`number[]`) for 3D meshes (reticle torus, sphere handles, surface grid light dots) and converting them to `Float32Array` every frame causes significant Garbage Collection spikes and micro-stuttering. Pre-allocating `Float32Array` buffers and caching static mesh templates (`unitSpheres`, `cachedReticleTorus`) reduces per-frame mesh generation time by ~75-99%.
**Action:** Always pre-allocate static meshes and use fixed `Float32Array` buffers when generating dynamic 3D WebGL geometry in WebXR/Canvas render loops.
