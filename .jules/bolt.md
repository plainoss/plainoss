## 2025-05-18 - WebXR WebGL Render Loop Allocation Hotspots

**Learning:** Re-creating vertex arrays and Float32Array typed buffers inside a 60-90 FPS WebXR animation loop creates ~4-6 MB/s of transient garbage allocations, leading to periodic GC stutter on mobile WebXR devices. Pre-allocating unit mesh geometry and using matrix uniform transforms alongside reusable scratch typed arrays eliminates runtime heap allocations completely.
**Action:** When working on WebGL/WebXR render engines in this codebase, pre-compute static meshes into Float32Array typed buffers at initialization and reuse scratch Float32Arrays for dynamic frame data instead of returning `number[]` or instantiating `new Float32Array(...)` per frame.
