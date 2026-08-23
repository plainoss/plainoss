## 2026-03-31 - Pre-allocate Transformation Matrices in WebXR Render Loops

**Learning:** Instantiating new `Float32Array` objects (e.g. identity matrices) inside WebXR animation frame rendering callbacks (`renderScene`) creates thousands of micro-allocations per second at 60-120 FPS. This leads to garbage collection pauses during spatial AR rendering.
**Action:** Always pre-allocate immutable matrix constants (like identity matrices) outside the frame callback loop or as module/class constants to maintain smooth 60-120 FPS rendering.
