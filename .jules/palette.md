## 2025-05-20 - Dialog and Drawer Keyboard Navigation & Contextual ARIA Labels

**Learning:** Dialog and drawer components (`HelpModal` and `HistoryDrawer`) lacked `Escape` key event listeners for closing modals and used generic labels ("Copy", "Delete") for dynamic list items.
**Action:** Always bind `Escape` key listeners on dialog/drawer components when `isOpen` is true, and provide contextual `aria-label`s for repeated item action buttons (e.g., `Copy measurement ${formatted}`).
