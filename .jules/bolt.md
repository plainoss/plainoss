## 2026-03-31 - WebXR 60-120fps Render Loop Pre-allocation Pattern

**Learning:** Re-generating 3D geometry arrays (spheres, cylinders, point cloud grids) inside `requestAnimationFrame` WebXR render loops creates thousands of transient JS objects and Float32Array allocations per frame, leading to periodic Garbage Collection micro-stutters in AR view.
**Action:** Precompute static unit geometries (spheres, toruses) into static WebGL VBOs once at setup and scale/position via model matrix uniforms. Pre-allocate fixed Float32Array buffers for dynamic geometry (connecting lines, room grid dots) and pass subarray slices to `gl.bufferData`.
