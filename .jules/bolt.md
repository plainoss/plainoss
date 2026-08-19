## 2025-05-20 - Canvas 3D Projection Layout Thrashing & WebXR Static Geometry Caching

**Learning:** In 3D canvas and WebXR rendering loops, calling DOM geometry methods like `getBoundingClientRect()` inside per-point projection functions causes severe forced synchronous layout thrashing (50+ layout flushes per frame). Additionally, regenerating static WebGL mesh arrays (`Float32Array`) inside stereo render loops generates thousands of short-lived allocations causing heavy GC stutter at 60-120fps.
**Action:** Cache canvas viewport dimensions on `Renderer3D` during `resize()`/`render()`, and pre-allocate static WebGL mesh buffers (`Float32Array`) during shader initialization rather than inside animation frame loops.
