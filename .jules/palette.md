## 2025-05-18 - Dialog Overlay & Toast Notification Accessibility

**Learning:** React overlay components (`HelpModal`, `HistoryDrawer`) and interactive toast notifications require explicit keyboard listener (`Escape` key) and semantic `<button type="button">` elements with descriptive `aria-label` attributes to be fully accessible for keyboard and screen reader users in WebXR apps.
**Action:** Always wrap modal/drawer keyboard handlers with Escape key down listeners and convert interactive list items or notification toasts to focusable buttons with clear ARIA labels.
