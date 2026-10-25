# Palette Journal

## 2025-05-18 - Interactive Elements with `role="button"` Require `onKeyDown` Handlers

**Learning:** React elements given `role="button"` and `tabIndex={0}` are focusable by keyboard navigation, but browsers do not automatically synthesize click events on `Enter` or `Space` keypresses for `div` elements. Explicit `onKeyDown` event handling is required for full keyboard accessibility.
**Action:** Always include an `onKeyDown` handler listening for `Enter` and `Space` when adding `role="button"` to non-button elements like `div`s.
