## 2025-05-20 - Modal Dialog Keyboard Dismissal (WCAG 2.1)

**Learning:** Modal overlay components using `role="dialog"` and `aria-modal="true"` must register a keyboard listener for the `Escape` key so keyboard and screen reader users can easily dismiss them without needing to tab through the interface to find a close button.
**Action:** Always add a `useEffect` keydown listener for `e.key === "Escape"` in any modal, drawer, or dialog overlay components.
