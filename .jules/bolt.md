## 2025-10-01 - WebXR 3D Mesh Geometry Pre-computation

**Learning:** Generating 3D mesh arrays (e.g. sphere/torus geometry) dynamically inside a WebGL/WebXR animation frame loop causes severe GC pressure and frame drops on high-refresh (60/120 Hz) mobile devices.
**Action:** Always pre-calculate unit 3D geometry into static WebGL VBOs once during engine initialization and transform instances using uniform scale/translation matrices (`uModelMatrix`).
