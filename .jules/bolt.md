## 2025-05-18 - Avoid getBoundingClientRect in Hot Canvas Projection Loops

**Learning:** Calling `canvas.getBoundingClientRect()` inside individual 3D point projection functions (`project()`) in `Renderer3D` caused dozens of DOM layout reads per frame, triggering forced layout recalculations and blocking hot JS math loops during 60 FPS rendering.
**Action:** Cache viewport dimensions (`viewportWidth`, `viewportHeight`) and precompute camera trigonometric transformations once per frame during `updateFrameState()` / `render()`.
