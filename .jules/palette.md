## 2025-09-03 - Modal and Drawer Keyboard Dismissal in WebXR Apps

**Learning:** Modal dialogs and slide-over drawers in WebXR web apps can trap keyboard focus or fail to handle `Escape` key events if missing global keydown listeners.
**Action:** Always attach an `Escape` keydown listener in `useEffect` for modal and drawer components when `isOpen` is true.
