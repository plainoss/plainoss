## 2026-08-18 - Clickable Toast Notifications Keyboard Accessibility

**Learning:** Interactive toast elements that accept `onClick` to dismiss must include explicit keyboard navigation support (`tabIndex={0}`, `role="button"`, `aria-label`, and `onKeyDown` handlers for Enter/Space keys). Without these, keyboard-only users and screen readers cannot focus or dismiss notifications manually.

**Action:** Whenever creating interactive notifications or toast items, ensure they are rendered with `role="button"`, `tabIndex={0}`, an explicit `aria-label` describing the action, and an `onKeyDown` listener for Enter and Space bar triggers.
