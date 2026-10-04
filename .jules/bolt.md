# Bolt's Journal - Critical Learnings

## 2025-05-18 - Precomputing WebGL 3D Meshes in WebXR Render Loop

**Learning:** In WebXR render loops (60-120 FPS), generating 3D meshes dynamically on the CPU inside each render frame creates thousands of temporary `Point3D` objects, JS arrays, and `Float32Array` allocations, triggering heavy Garbage Collection pauses and dropped frames.
**Action:** Pre-generate static 3D meshes (reticle torus, center dot, handle spheres) into static `Float32Array` instances at engine initialization, and use 4x4 matrix transforms (`uModelMatrix`) to position them in 3D space.
