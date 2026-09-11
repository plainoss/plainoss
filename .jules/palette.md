## 2025-05-18 - Non-Native Interactive Elements & Dialog Dismissal
**Learning:** Custom interactive elements using `role="button"` and `tabIndex={0}` do not natively trigger `onClick` when pressing Enter or Space; explicit `onKeyDown` handlers are required. Furthermore, custom dialog/drawer components should always listen for the `Escape` key to provide intuitive keyboard dismissal.
**Action:** When adding `role="button"` or creating custom modals/drawers, ensure keyboard activation (`Enter`/`Space`) and keyboard dismissal (`Escape`) are wired up.
