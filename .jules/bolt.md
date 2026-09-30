## 2025-09-30 - WebXR Geometry Mesh Precomputation & Unit Sphere Caching

**Learning:** Generating 3D primitive mesh geometries (spheres, toruses) inside the 60-90Hz WebXR frame loop causes severe CPU overhead (thousands of trig `Math.sin`/`Math.cos` calls) and high garbage collection pressure from temporary JS array allocations.
**Action:** Precompute static meshes (reticle rings/dots) as Float32Array and use cached unit sphere vertices for handle spheres, applying linear scaling and translation (`center + unit_vertex * radius`) instead of re-evaluating trigonometric functions per frame.
