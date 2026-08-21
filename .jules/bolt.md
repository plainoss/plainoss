## 2025-02-18 - Precomputing 3D WebXR Meshes Eliminates Frame Allocation Overhead
**Learning:** Generating 3D parametric meshes (spheres, toruses) inside the WebXR animation frame loop creates thousands of temporary floats and JS arrays every second (1.5-3 MB/s at 60-120 FPS), causing GC micro-stutters during spatial rendering.
**Action:** Precompute static origin-centered Float32Arrays during WebGL initialization and transform them via model matrix uniforms (`uModelMatrix`) in WebGL shaders.
