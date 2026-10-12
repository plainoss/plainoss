## 2025-05-18 - Toast Notification Accessibility & Interactive Focus
**Learning:** Adding `tabIndex={0}` to a container div while having a nested focusable button creates confusing keyboard focus stops for screen readers and keyboard navigation.
**Action:** Focus state should be placed directly on the action button or the container, avoiding nested interactive focus stops in toast components.
