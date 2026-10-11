# Palette's UX & Accessibility Journal

## 2025-05-18 - Modal and Drawer Escape Key Accessibility

**Learning:** Modal overlays (`role="dialog"`) require explicit `KeyboardEvent` event listeners on `window` to handle the `Escape` key in React components that render conditionally. Without an active keyboard listener, users relying solely on keyboard navigation are unable to dismiss overlays.
**Action:** When creating modal dialogs or slide-out drawers, include a `useEffect` hook listening for `Escape` key events while open to ensure standard keyboard dismissal.
