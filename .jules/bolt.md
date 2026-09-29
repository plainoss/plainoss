## 2025-02-18 - Avoid DOM Layout Reads & Trig Recalculation inside Canvas Rendering Loops

**Learning:** Querying `canvas.getBoundingClientRect()` or calculating `Math.sin`/`Math.cos` inside per-point 3D projection functions (called 50-100+ times per frame) causes severe DOM layout thrashing and redundant arithmetic.
**Action:** Always cache canvas viewport dimensions in `resize()` handlers and precompute camera trigonometric matrices/values at the start of each frame before projecting points.
