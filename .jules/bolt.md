# Bolt's Journal - Critical Performance Learnings

## 2025-02-18 - Avoid DOM layout queries and redundant trig in 3D Canvas render loops

**Learning:** Calling `getBoundingClientRect()` inside point projection helpers during Canvas 2D/3D render loops triggers browser layout queries dozens of times per frame (~4,000+ per second at 60fps), causing unnecessary overhead. Additionally, recalculating trigonometric values (`Math.cos`/`Math.sin`) for camera angles on every projected point adds thousands of redundant floating-point calculations per frame.
**Action:** Always cache canvas/viewport dimensions during canvas `resize()` events and precalculate frame-constant trigonometric values at the start of `render()` before projecting points.
