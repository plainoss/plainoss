## 2026-03-31 - WebXR Render Loop Geometry Pre-computation & Buffer Reuse

**Learning:** WebXR frame callbacks (`onXRFrame`) run at 60Hz–120Hz on mobile devices. Re-creating static WebGL meshes (e.g. reticle torus/sphere) and instantiating dynamic `number[]` arrays or `new Float32Array(...)` every frame generates heavy GC pressure and executes thousands of redundant trigonometric calculations per second.

**Action:** Always pre-compute static WebGL geometry into `Float32Array` buffers on engine initialization and use pre-allocated TypedArray buffers with views (`.subarray(...)`) for dynamic particle/grid rendering in WebXR engines.
