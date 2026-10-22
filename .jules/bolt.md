## 2025-02-23 - Avoid DOM layout queries and redundant trig math in 3D canvas render loops

**Learning:** Calling `canvas.getBoundingClientRect()` inside inner rendering loops (like 3D point projection) causes DOM reads / layout queries on every point calculation (50-100+ times per frame at 60fps). Additionally, recomputing trigonometric functions (`Math.cos` / `Math.sin`) for static frame camera orientations inside point projection function calls incurs massive redundant math overhead.

**Action:** Cache canvas viewport dimensions on `resize()` or frame start, and precompute camera orientation trigonometric factors at the beginning of each render pass.
