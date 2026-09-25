# Bolt's Journal - Critical Learnings

## 2025-02-17 - WebXR Per-View Render Loop GC & Geometry Allocation Bottlenecks

**Learning:** WebXR stereo rendering invokes `renderScene` twice per frame (once per eye view) at 60–120 FPS. Generating 3D mesh arrays (e.g. torus rings, sphere handles, cylinder tubes) inside the render loop allocated ~2,500 intermediate JS objects and Float32Arrays per frame. In WebXR, this caused frequent garbage collection pauses and frame drops on high-refresh-rate mobile AR headsets/phones.

**Action:**

1. Pre-compute static Float32Arrays once during engine initialization for constant mesh geometry (reticle rings, targeting dots).
2. Use unit sphere meshes with instance model matrices (`uModelMatrix` scale/translation) for dynamic anchor handles instead of regenerating sphere vertices for each handle location.
3. Use instance/reusable pre-allocated Float32Array buffers and typed array views for dynamic line cylinders and point grids to maintain zero per-frame heap allocations.
