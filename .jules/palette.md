# Palette's UX Journal

## 2025-05-18 - Overlay Controls and Custom Interactive Elements Accessibility
**Learning:** Custom interactive overlay elements (such as tap-to-start AR launchers with `role="button"`) and modal/drawer overlays in WebXR applications often lack keyboard interaction event listeners (`onKeyDown` for Enter/Space keys on custom buttons, and `Escape` key listeners for modals/drawers).
**Action:** When implementing modal dialogs, drawers, or custom clickable `role="button"` elements in WebXR/web apps, always attach `onKeyDown` event listeners to support Space/Enter activation and `Escape` key dismissal for full keyboard navigation parity.
