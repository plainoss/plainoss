## 2025-05-18 - WebXR 60 FPS Render Loop Geometry Pre-computation

**Learning:** Generating parametric 3D meshes (e.g. torus reticles, sphere handle indicators) dynamically inside the WebXR `requestAnimationFrame` render loop causes continuous trigonometric recalculations (`Math.sin`/`Math.cos`) and heavy JS object allocation/garbage collection pressure (~70-90ms per 600 frames).
**Action:** Pre-compute unit mesh templates and static geometry `Float32Array` buffers at module initialization. In render frames, scale and offset template arrays or reuse static buffers directly.
