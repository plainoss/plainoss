## 2025-05-20 - Overlay Keyboard Dismissal in WebXR UI

**Learning:** Modal dialogs and overlay drawers (`HelpModal`, `HistoryDrawer`) in WebXR application overlays must explicitly bind `Escape` key event listeners during their open state so keyboard users can dismiss them without losing focus or needing mouse interaction.
**Action:** When creating or extending overlay modal/drawer components, always attach a `keydown` Escape listener inside a `useEffect` guarded by `isOpen`.
