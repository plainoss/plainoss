## 2025-05-18 - Zero-Allocation WebXR Geometry Rendering

**Learning:** Generating 3D mesh arrays (`number[]` and `Float32Array`) on every WebXR animation frame creates high garbage collection pressure, causing dropped frames in 60-120Hz AR. Pre-building unit GPU buffers and using `uModelMatrix` uniform scaling/translation alongside reusable `Float32Array` buffers eliminates per-frame allocations.
**Action:** Always pre-allocate static WebGL geometry buffers during engine initialization and reuse fixed `TypedArray` buffers for dynamic WebXR geometry.
