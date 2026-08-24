## 2026-08-24 - Accessible Toast Notifications & Dismissal Controls

**Learning:** In WebXR and web applications, replacing whole-toast click handlers with explicit `<button>` dismiss controls and appropriate ARIA live region attributes (`role="status"` vs `role="alert"`) ensures keyboard focusability, screen reader accessibility, and prevents accidental dismissals.
**Action:** Always provide explicit close buttons with descriptive `aria-label` attributes for transient UI overlays and toasts.
