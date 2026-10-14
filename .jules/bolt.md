## 2025-05-18 - Pre-computing static WebGL VBOs in WebXR animation loop

**Learning:** Allocating JS arrays and re-calculating 3D mesh trigonometry (`Math.sin`/`Math.cos`) inside a WebXR `requestAnimationFrame` loop (60–120 FPS) triggers frequent garbage collection pauses and high CPU overhead. Pre-computing static unit geometries into GPU VBOs (`STATIC_DRAW`) during WebGL initialization and using scale/translation model matrices eliminates runtime GC pressure and CPU computation.
**Action:** Always pre-allocate static 3D meshes and re-usable matrix arrays outside high-frequency WebGL render loops.
