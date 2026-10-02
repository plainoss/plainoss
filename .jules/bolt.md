## 2026-10-02 - Eliminate DOM Layout Thrashing in Canvas 3D Projection Loops

**Learning:** Invoking `HTMLCanvasElement.getBoundingClientRect()` inside inner per-point 3D projection methods (`project(p)`) causes severe DOM layout thrashing (synchronous layout recalculations) when called 60-100+ times per frame in 60FPS animation and rendering loops. Furthermore, recalculating trigonometric values (`Math.cos`/`Math.sin`) for camera yaw and pitch on every point projection adds unnecessary floating-point operations.

**Action:** Always precompute camera matrix trigonometric constants and update cached canvas viewport dimensions once at the start of the frame (`render()`) or during resize events, rather than querying DOM methods or recomputing trig functions inside per-item projection routines.
