## 2025-05-18 - Pre-allocate typed array buffers in WebXR / WebGL render loop

**Learning:** Generating raw JS arrays (`number[]`) and object literals `{x, y, z}` in 60-120 FPS WebXR animation loops causes severe garbage collection (GC) frame stutters. Pre-allocating `Float32Array` buffers and pre-caching static mesh geometry eliminates per-frame heap allocations.
**Action:** Always pre-allocate reusable typed buffers for dynamic WebGL geometry and cache static mesh vertices during engine initialization.
