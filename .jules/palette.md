## 2025-05-18 - Overlay Keyboard Dismissal

**Learning:** Modal and drawer overlays (`HelpModal`, `HistoryDrawer`) in this application require explicit `Escape` key event listeners to ensure keyboard users can easily dismiss dialogs without relying solely on pointing device clicks or explicit button navigation.
**Action:** Always register a `keydown` listener for `"Escape"` inside modal/drawer overlays when `isOpen` is `true`, and clean it up when `isOpen` changes or unmounts.
