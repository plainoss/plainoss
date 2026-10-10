## 2026-10-10 - WebXR Render Loop Mesh Precomputation

**Learning:** Re-generating static 3D geometry (like torus rings and targeting spheres) on every frame of a WebXR animation loop (60-120 FPS) triggers thousands of trigonometric operations (`Math.sin`, `Math.cos`) and intermediate array/object allocations per frame, leading to GC pauses and jank on mobile AR devices.
**Action:** Precompute static WebGL geometry into `Float32Array` buffers on initialization, and use linear vertex offsets (`+ p.x`, `+ p.y`, `+ p.z`) from origin-centered cached meshes for dynamic handle positions instead of re-evaluating trigonometric routines.
