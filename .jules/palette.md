## 2025-10-02 - Modal and Overlay Escape Key Navigation
**Learning:** React modal and drawer overlays with `role="dialog"` must include `Escape` key listeners to satisfy WCAG keyboard navigation requirements.
**Action:** When building dialog or drawer overlay components, always pair `role="dialog"` with a `useEffect` keydown listener for `Escape` to ensure accessible dismiss behavior.
