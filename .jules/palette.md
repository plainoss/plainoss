# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Fullscreen Launcher Accessibility
**Learning:** Fullscreen overlays used as tap launcher screens in WebXR / Canvas applications can easily miss keyboard accessibility if implemented as non-semantic `div` elements without keyboard handlers.
**Action:** Use native `<button>` elements with CSS resets and clear `:focus-visible` outlines for full-viewport interactive overlays.
