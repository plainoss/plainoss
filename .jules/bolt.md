# Bolt's Journal - Critical Learnings

## 2025-05-18 - Pre-computing Static WebXR 3D Reticle Mesh Data

**Learning:** Generating WebGL 3D meshes (e.g. torus and sphere geometry) on every WebXR frame (`requestAnimationFrame` at 60-120 Hz) incurs significant CPU overhead from trigonometric calculations (`Math.cos`/`Math.sin`) and triggers garbage collection due to constant short-lived array allocations.
**Action:** Pre-compute static mesh geometries as `Float32Array` buffers during engine initialization and reuse them directly in `gl.bufferData()` during frame rendering.
