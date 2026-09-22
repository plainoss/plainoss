## 2025-05-18 - WebXR 60/90 FPS Render Loop Allocation Bottlenecks

**Learning:** In WebXR and WebGL 3D render loops, constructing mesh geometry via JavaScript arrays (`number[]`) and instantiating temporary `Float32Array` objects inside `requestAnimationFrame` creates severe GC pressure and frame drops on mobile devices. Standardizing on origin-centered precomputed static meshes transformed via model matrix uniforms (`uModelMatrix`) and pre-allocated `Float32Array` buffers eliminates heap allocations completely during rendering.
**Action:** In WebGL render loops, precompute static geometries on engine setup and write dynamic vertices directly into reusable, pre-allocated `Float32Array` buffers rather than creating temporary JS arrays or objects per frame.
