## 2025-05-18 - WebXR Zero-Allocation Render Loop Pattern

**Learning:** WebXR frame rendering loops running at 60–120 FPS suffer from severe garbage collection frame drops if 3D mesh geometry arrays (`Float32Array` or JS `number[]`) are generated on the CPU every frame.
**Action:** Pre-calculate static 3D unit/shape meshes once at initialization, position meshes using `uModelMatrix` uniforms, and use pre-allocated `Float32Array` buffers with `.subarray()` views for dynamic geometry to maintain a 0-allocation render loop.
