## 2025-05-18 - Caching Viewport Rect and Trig Factors in Canvas 3D Render Loops

**Learning:** In 3D canvas renderers, invoking `canvas.getBoundingClientRect()` inside per-point projection methods (`project()`) during 3D grid and scene render loops causes severe DOM layout thrashing. In addition, recalculating camera trigonometric functions (`Math.cos`/`Math.sin`) for every point projection adds hundreds of redundant math operations per frame.
**Action:** Always precompute camera trig factors and cache canvas viewport dimensions once per render frame pass or resize event rather than querying DOM bounds inside inner projection loops.
