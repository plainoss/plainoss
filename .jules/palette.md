# Palette Journal - UX & Accessibility Learnings

## 2026-09-22 - Modal Dialog & Interactive Toast Accessibility

**Learning:** Modal components (`HelpModal`, `HistoryDrawer`) and interactive notifications (`ToastContainer`) in web-ar-ruler required explicit keyboard handlers (`Escape` key dismiss) and semantic elements (`<button type="button">` with `aria-label`) so screen reader and keyboard users can navigate and dismiss overlays seamlessly.
**Action:** Always ensure modal/drawer overlays register `Escape` key listeners on open, and convert clickable alert/toast items to `<button>` elements with descriptive `aria-label` text.
