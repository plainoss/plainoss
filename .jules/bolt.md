## 2025-02-18 - WebXR 60-120Hz Render Loop Geometry Allocation & VBO Buffering

**Learning:** In WebXR and WebGL frame rendering loops (running at 60Hz to 120Hz), generating 3D meshes dynamically on every frame creates ~10,000 array/number object allocations and hundreds of trigonometric calculations per frame. This triggers frequent Garbage Collection pauses and micro-stutters during AR spatial tracking sessions.
**Action:** Pre-compute static geometry (reticles, targeting dots, unit sphere handle anchors) into WebGL VBO buffers ONCE on initialization (`STATIC_DRAW`). Use matrix scale and translation transforms (`uModelMatrix`) to render dynamic instances without regenerating mesh arrays in the render loop.
