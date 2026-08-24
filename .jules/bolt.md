## 2025-05-20 - WebXR AR Rendering Optimization (Zero-Allocation 60/120FPS WebGL Loop)

**Learning:** In WebXR animation loops running at 60Hz - 120Hz, generating 3D meshes (spheres, toruses, cylinders, point clouds) on every frame creates heavy GC pressure and stalls frame delivery due to repeated `gl.bufferData` re-uploads.
**Action:** Precompute unit geometries (unit sphere, torus reticle, dot) into static GPU VBOs using `gl.STATIC_DRAW`, transform unit spheres via `uModelMatrix` uniforms per handle, and use pre-allocated typed arrays for dynamic geometry (cylinders, point cloud) to maintain 0 B/frame garbage collection and avoid CPU-GPU transfer bottlenecks.
