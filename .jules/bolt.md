## 2025-05-20 - WebXR Render Loop Zero-Allocation Mesh Caching

**Learning:** Re-generating 3D meshes (e.g. torus, sphere, cylinder) and instantiating `Float32Array` objects inside a 60-120 FPS WebXR `requestAnimationFrame` loop creates severe Garbage Collection pressure and CPU overhead, causing frame drops and motion jitter in AR/VR headsets and mobile devices.
**Action:** Always pre-compute static geometry meshes into persistent `Float32Array` buffers at engine initialization, use GPU `uModelMatrix` uniforms for translations, and populate reusable `Float32Array` views for dynamic geometries.
