# Bolt's Performance Journal ⚡

## 2025-05-18 - WebXR 60-120 FPS Loop Zero-Allocation Mesh Buffering

**Learning:** Re-generating 3D geometry arrays and constructing JS mesh objects inside `requestAnimationFrame` or WebXR frame loops causes severe Garbage Collection (GC) jank and frame drops on mobile WebXR devices (e.g. Android Chrome ARCore). Pre-uploading static VBO meshes (like reticle rings, targeting dots, handle spheres) and using GPU translation model matrices (`uModelMatrix`) completely eliminates per-frame heap allocations. For dynamic meshes (cylinder tubes and room particle grids), streaming vertex attributes directly into pre-allocated `Float32Array` buffers prevents GC pauses during high-frequency frame rendering.
**Action:** Always pre-allocate typed array buffers and static VBOs for WebGL/WebXR render loops; position static meshes using GPU matrix uniforms rather than regenerating vertex positions on the CPU.
