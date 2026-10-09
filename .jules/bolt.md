# Bolt's Journal - Critical Performance Learnings

## 2025-10-09 - Pre-computing WebXR Static Geometries

**Learning:** In WebXR 60-120 FPS render loops, constructing 3D meshes (e.g. spheres, torus rings) from scratch using trigonometric loops (`Math.sin`, `Math.cos`) on every frame creates heavy CPU bottlenecks and garbage collection pauses due to frequent typed array allocations.
**Action:** Upload unit mesh geometries (unit sphere, unit torus ring) to GPU static buffers (`STATIC_DRAW`) during initialization, and use 4x4 matrix transforms (`uModelMatrix`) in WebGL vertex shaders for positioning and scaling.
