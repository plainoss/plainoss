## 2025-05-18 - Keyboard & Screen Reader Accessibility for Overlay Launchers & Notifications

**Learning:** Interactive overlay elements (like full-screen tap-to-start launchers and dismissible toast notifications) rendered as `<div>`s or lacking keyboard event handlers leave screen reader users and keyboard-only users unable to activate or dismiss them. Using semantic `<button>` elements with clear `aria-label`s and `focus-visible` styling (or attaching `onKeyDown` listeners to `role="button"` targets) ensures seamless keyboard navigation and screen reader feedback.

**Action:** When building interactive overlays or notification banners, use semantic `<button type="button">` elements with explicit `aria-label`s and `:focus-visible` ring styles, or ensure custom `role="button"` elements handle `Enter` and `Space` keypresses.
