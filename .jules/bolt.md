## 2025-05-18 - Cache Unit Geometry for WebGL/WebXR Instanced Rendering

**Learning:** Re-generating 3D mesh vertex arrays on CPU and re-uploading via `gl.bufferData` inside a 60 FPS animation loop causes noticeable CPU overhead and garbage collection pressure in WebGL/WebXR apps. Pre-generating a normalized unit mesh (e.g., unit sphere) and applying scale and translation via a 4x4 `uModelMatrix` uniform eliminates per-frame allocations and GPU buffer re-uploads.
**Action:** Always pre-generate static primitive geometries (spheres, cubes, unit quads) during WebGL initialization and transform them using matrix uniforms in render passes.
