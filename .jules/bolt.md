## 2025-05-18 - Pre-buffer Static 3D Meshes in WebXR Render Loops

**Learning:** Generating 3D meshes (e.g. torus reticles, sphere handles) dynamically inside `requestAnimationFrame` / `onXRFrame` loops at 60–120 FPS causes heavy CPU trigonometric overhead (`Math.sin`/`Math.cos`) and thousands of JS object allocations per frame, leading to GC frame drops in WebXR sessions.
**Action:** Pre-compute static geometry into dedicated static WebGLBuffers (`STATIC_DRAW`) during engine initialization, and use `uModelMatrix` uniforms (with scratch matrix arrays) to transform instances per frame.
