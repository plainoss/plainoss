# Bolt's Performance Journal

## 2025-05-18 - WebXR Mesh Regeneration Anti-Pattern
**Learning:** Generating 3D parametric meshes (torus reticles and sphere handles) inside the WebXR animation loop re-evaluates thousands of trigonometric operations (`Math.sin`/`Math.cos`) and creates hundreds of JS arrays every frame (60–120fps), triggering frequent GC pauses and CPU overhead on mobile AR devices.
**Action:** Pre-compute origin-centered mesh geometries into static `Float32Array` buffers during initialization, and use WebGL model matrix transformations (`uModelMatrix`) for positioning in `renderScene`.
