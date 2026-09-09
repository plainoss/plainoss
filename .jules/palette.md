## 2025-05-18 - Modal Dialog Escape Key & Toast Notification Keyboard Accessibility
**Learning:** React modal dialogs (`role="dialog"`) and slide-over drawers require explicit `Escape` keydown listeners to satisfy WCAG keyboard navigation standards. Interactive toast notifications should use semantic `<button type="button">` elements with explicit `aria-label` text rather than `<div>` elements with `onClick`.
**Action:** Always verify that overlay dialogs bind an `Escape` key handler in `useEffect` and interactive feedback toasts are standard HTML button elements.
