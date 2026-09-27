## 2025-05-18 - WebGL/WebXR Frame Allocation & Static Geometry Precomputation

**Learning:** In WebXR/WebGL animation loops (running at 60-120 FPS per view), generating 3D geometry arrays and re-calculating trigonometric positions (`Math.cos`, `Math.sin`) on every frame creates heavy GC pressure and CPU overhead, leading to frame drops in immersive AR.
**Action:** Pre-compute static mesh geometries (like torus rings and unit spheres) into `Float32Array` or WebGL buffers once at initialization, and use transformation matrices (`uModelMatrix`) for positioning and scaling. Re-use typed arrays for dynamic buffers (like point cloud grids).
