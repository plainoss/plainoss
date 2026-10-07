## 2025-02-18 - Pre-compute WebXR 3D Static Geometry & Reuse Matrix Buffers

**Learning:** Re-generating 3D mesh vertex arrays (`createSphereMesh`, `createTorusMesh`) and instantiating `Float32Array` objects inside per-frame WebXR render loops (60-120 FPS, 2 views per stereo frame) creates heavy JavaScript object allocation churn and garbage collection pauses during AR/VR tracking.
**Action:** Pre-compute unit geometry meshes (`Float32Array`) during engine initialization, pre-allocate transformation matrices (`Float32Array(16)`), and scale/translate 3D handles using shader model matrix uniforms (`uModelMatrix`) rather than regenerating vertex positions on the CPU.
