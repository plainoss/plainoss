# Bolt's Performance Journal - WebAR & Geometry Learnings

## 2025-05-18 - Pre-compute Static Geometry Buffers in WebXR Rendering Loops

**Learning:** In WebXR render loops (60-90 Hz stereo rendering), generating mesh vertex arrays dynamically using trigonometric functions (`Math.sin`/`Math.cos`) causes massive CPU overhead and GC pressure from repeated JS array and `Float32Array` allocations.
**Action:** Pre-compute static geometry meshes (like reticle rings and origin shapes) during engine setup and cache unit sphere templates to transform vertices via offset/scale rather than re-evaluating trigonometric routines per frame.
