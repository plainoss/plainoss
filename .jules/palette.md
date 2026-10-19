## 2025-05-18 - Modal and Drawer Dialog Keyboard/Screen-Reader Ergonomics

**Learning:** In WebXR spatial utilities with custom overlays (`role="dialog"` or `aria-modal="true"`), overlay dialogs and drawers must handle the `Escape` key to allow keyboard users to dismiss them without mouse interaction. Additionally, repetitive action buttons inside drawer list cards require context-specific `aria-label`s (e.g., `Copy 1.50 m measurement`) rather than ambiguous generic text.
**Action:** When adding or auditing overlays and drawer components, always bind `Escape` keydown handlers during display and provide explicit context in `aria-label` and `title` attributes for repeated item actions.
