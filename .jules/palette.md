## 2026-03-29 - Contextual Accessible Labels in History & List Actions

**Learning:** Buttons inside list items or record cards (such as "Copy" or "Delete") need dynamic, descriptive `aria-label`s including the item context (e.g. `Copy measurement 1.50 m`), because generic labels like "Copy" or "Delete" repeated across multiple list items create ambiguity for screen reader users navigating by interactive controls.

**Action:** Always include item context (e.g., `r.formatted` or `item.name`) in `aria-label` attributes when rendering action buttons inside dynamic lists or cards.
