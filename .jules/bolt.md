## 2025-05-18 - Avoid DOM Layout Queries and Trig Recalculations in 3D Projection Loops

**Learning:** Calling `getBoundingClientRect()` or recomputing `Math.cos`/`Math.sin` for every 3D point inside `Renderer3D.project()` causes DOM layout thrashing and redundant math overhead during animation frames.
**Action:** Cache canvas viewport dimensions on `resize()` and update camera trigonometric values (`cosY`, `sinY`, `cosP`, `sinP`) once per render pass instead of inside per-point projection functions.
