## 2025-09-04 - Cache Static Geometry in WebXR Render Loops
**Learning:** Generating static 3D mesh vertices with trigonometric functions inside WebXR/WebGL `requestAnimationFrame` loops (60-120 FPS) creates thousands of array allocations and trigonometric calculations per second, placing high pressure on garbage collection and CPU thread budget.
**Action:** Always lazy-initialize and cache static 3D mesh `Float32Array` buffers (and use `gl.STATIC_DRAW`) when model matrices handle position/orientation in render loops.
