# Bolt's Journal - Critical Learnings

## 2025-03-09 - WebXR Frame-Loop TypedArray Pre-allocation

**Learning:** Re-allocating arrays and TypedArrays inside WebXR `requestAnimationFrame` loops (60-120 FPS) introduces significant GC pressure and micro-stutters. Using a persistent `Float32Array` buffer with `.subarray(0, count)` views combined with squared-distance early exits (`dx^2 + dz^2 > maxRadius^2`) reduces frame overhead significantly (~2.5x speedup in point cloud grid generation).
**Action:** Always pre-allocate Float32Array buffers for WebGL / WebXR frame render routines and use squared distance checks for spatial grid loops.
