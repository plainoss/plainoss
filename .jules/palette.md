## 2025-05-20 - Abbreviated Measurement Unit Toggle Accessibility

**Learning:** Short measurement unit abbreviations (e.g., "in", "ft", "yd", "mm") on segmented toggle controls are ambiguous or mispronounced by screen readers (e.g., "in" read as the preposition "in").
**Action:** Always provide full unit names in `aria-label` and `title` attributes (e.g., `aria-label="Inches" title="Inches"`) for unit selection buttons.
