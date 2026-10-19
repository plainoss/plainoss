## 2025-02-21 - Caching Canvas Viewport and Trigonometric Constants in Render Loops

**Learning:** Calling `getBoundingClientRect()` inside 3D projection or canvas render loops forces synchronous browser layout calculation on every projected point (~50-100 times per frame). Similarly, calling `Math.cos()` and `Math.sin()` repeatedly per vertex in loops with identical camera angles wastes hundreds of CPU ops per frame.

**Action:** Cache viewport dimensions in `resize()` and `render()`, and precompute camera trigonometric values (`cosY`, `sinY`, `cosP`, `sinP`) prior to iterating over 3D vertices/points in canvas renderers.
