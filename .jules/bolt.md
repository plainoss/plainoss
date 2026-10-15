# Bolt's Performance Journal

## 2025-05-18 - Allocation-Free WebXR Render Loops & Static Mesh Precalculation

**Learning:** In WebXR/WebGL render loops (running at 60-120 FPS per eye), generating procedural 3D meshes (such as torus rings or sphere handles) inside the render loop using `Math.sin`/`Math.cos` creates thousands of temporary JS objects and typed arrays per second. This triggers frequent Garbage Collection (GC) pauses on mobile AR devices.

**Action:** Always precalculate static 3D meshes at origin (`Float32Array`) during initialization and transform them at render time via `uModelMatrix` (or reusable translation matrices). Avoid array allocations (`new Float32Array(...)` or `.push()`) inside `requestAnimationFrame` render routines.
