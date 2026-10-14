# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Interactive Toast Notifications in Overlay Environments

**Learning:** Toast notifications in AR / fullscreen canvas overlays need explicit icon indicators, screen-reader role regions, and interactive dismiss controls with keyboard accessibility (Enter/Space triggers and accessible ARIA labels) so users relying on screen readers or keyboard navigation can easily understand and clear status messages without triggering underlying canvas tap events.
**Action:** Always provide dedicated status icons, explicit `<button aria-label="Dismiss notification">` elements, and `onKeyDown` handlers for clickable toast containers in canvas/XR apps.
