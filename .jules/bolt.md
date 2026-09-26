## 2025-05-20 - WebXR Render Loop Zero-Allocation Pattern

**Learning:** Re-generating 3D geometry arrays (`number[]` and `Float32Array`) and `Point3D` objects inside high-frequency WebXR rendering loops (60-90+ FPS per eye) creates severe JS garbage collection (GC) pressure and main-thread frame stutters.
**Action:** Pre-allocate static VBOs for unit 3D geometry (spheres, toruses) on WebGL initialization, transform them in shader uniforms via matrix scale/translation, and fill dynamic lines/grids in-place using pre-allocated `Float32Array` scratch buffers.
