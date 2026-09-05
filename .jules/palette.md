# Palette's Journal

## 2026-09-05 - Overlay Dialogs & Custom Button Role Keyboard Events

**Learning:** Custom interactive `role="button"` containers and overlay dialogs/drawers require explicit keyboard event handlers (Enter/Space for custom buttons, Escape key listeners for dialogs) and item-specific ARIA labels when multiple similar actions exist in lists.
**Action:** Always pair `role="button"` on non-button DOM elements with `onKeyDown` handlers for Enter and Space, register global `Escape` listeners on modal overlays, and attach contextual `aria-label`s to repeating list buttons.
