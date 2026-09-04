## 2025-05-18 - Modal Overlay Keyboard Dismissal and Dynamic Action Labels

**Learning:** Overlay modals and drawers with `role="dialog"` must support the `Escape` key to allow screen reader and keyboard users to dismiss them seamlessly. Additionally, repeated action buttons inside dynamic lists (like History list items) need record-specific `aria-label` attributes (e.g., `aria-label="Delete measurement 3.50 m"`) so screen readers provide clear context beyond generic "Delete" labels.
**Action:** Always attach a global `keydown` listener for `Escape` when rendering modal or drawer components, and format dynamic list item button `aria-label`s with distinct identifying details.
