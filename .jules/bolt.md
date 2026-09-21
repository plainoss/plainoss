## 2025-05-18 - Pre-compute Static Geometry Buffers in WebXR Frame Loops

**Learning:** In WebXR render loops (running at 60–90 FPS), dynamically generating complex 3D meshes (e.g. reticle torus rings and anchor spheres) on every frame executes hundreds of trigonometric operations (`Math.sin`/`Math.cos`) and creates garbage collection pressure via array allocations. Pre-computing unit Float32Array geometry buffers at initialization and applying linear scaling/translation per frame completely removes trigonometric overhead and allocations in the hot animation frame path.
**Action:** Always pre-compute static/unit 3D shape vertex data during engine instantiation rather than constructing mesh arrays inside the animation/render loop.
