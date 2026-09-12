## 2025-09-12 - Keyboard Dismiss for Overlays and Abbreviated Unit Buttons

**Learning:** React modal/drawer overlays and toast notifications in canvas-heavy web applications often miss standard keyboard accessibility handlers like the Escape key and Enter/Space focus-dismissal. Furthermore, icon-only or abbreviated unit control buttons (e.g. "m", "in", "ft") lack full context for screen readers without descriptive `aria-label` and `title` attributes.
**Action:** Always ensure modal overlays listen for Escape key events and abbreviated unit controls provide full descriptive `aria-label` text for assistive technologies.
