## 2025-05-18 - Pre-compute Static WebGL Geometries in AR Render Loops

**Learning:** Generating 3D mesh vertex arrays using trigonometric functions (`Math.sin`/`Math.cos`) and instantiating JS arrays/`Float32Array` inside 60-120Hz `requestAnimationFrame` render loops creates severe garbage collection spikes (>4MB/s) and CPU bottlenecks on mobile AR devices.
**Action:** Pre-compute static geometry data (`Float32Array`) during WebGL initialization and transform unit primitives via model matrix (`uModelMatrix`) in vertex shaders instead of re-creating mesh arrays every frame.
