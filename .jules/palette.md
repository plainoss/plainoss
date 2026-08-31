## 2025-05-10 - Interactive Toast Accessibility

**Learning:** Interactive toast notifications that can be dismissed on click must have `role="button"`, `tabIndex={0}`, an explicit `aria-label`, and keyboard event handlers (`Enter`/`Space`) so keyboard and screen reader users can perceive and dismiss them.
**Action:** Always provide full keyboard interactivty (`tabIndex={0}`, `onKeyDown`) and clear `aria-label` when making clickable dismissable toasts or status banners.
