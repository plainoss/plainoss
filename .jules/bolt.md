## 2025-05-18 - Pre-computing WebGL Meshes for WebXR Render Loops

**Learning:** Generating 3D mesh vertex arrays and calling trigonometric functions (`Math.sin`/`Math.cos`) inside WebXR 60-120 FPS render loops creates continuous garbage collection (GC) pressure and CPU stutters in VR/AR headsets and high refresh rate mobile devices.
**Action:** Pre-compute static geometry meshes (`Float32Array`) at module initialization and use GPU matrix uniforms (`uModelMatrix`) for affine scale and translation transformations of unit shapes (e.g., spheres, cylinders) during rendering.
