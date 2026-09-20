## 2025-05-18 - Pre-compute Static Geometry in WebXR Frame Loops

**Learning:** In WebXR/WebGL render loops running at 60-120 FPS, generating 3D meshes dynamically with trigonometric functions (`Math.sin`/`Math.cos`) and instantiating `Float32Array` objects inside `requestAnimationFrame` creates thousands of temporary heap allocations per second, leading to GC pauses and dropped frames in AR/VR headsets.
**Action:** Pre-compute static 3D geometry (torus reticles, unit spheres, dot meshes) into static `Float32Array` buffers during engine initialization and reuse a scratch model matrix for scaling/translation.
