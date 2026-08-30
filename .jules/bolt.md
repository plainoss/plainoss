## 2025-08-30 - WebXR Render Loop Geometry Allocation Bottleneck

**Learning:** Generating dynamic WebGL mesh arrays (`number[]`) and instantiating `new Float32Array(...)` per view/frame inside WebXR `requestAnimationFrame` loops (called up to 240 times/sec for stereo views) creates massive memory allocation churn (~1M array elements/sec) and causes garbage collection stuttering during AR tracking.
**Action:** Always pre-compute static WebGL mesh buffers as `Float32Array` at initialization time and pre-allocate typed arrays outside stereo view loops in WebXR render pipelines.
