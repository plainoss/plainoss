# Palette's Journal - Critical Learnings

## 2025-05-18 - Distance Unit Selector Labels

**Learning:** Screen readers announce abbreviated unit codes (e.g. "m", "cm", "yd") without full context when unit selector radio buttons lack aria-labels.
**Action:** Always provide full descriptive `aria-label` and `title` attributes (e.g. "Meters", "Yards") on segmented unit toggle controls.
