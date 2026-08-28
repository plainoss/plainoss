## 2025-05-15 - Contextual Action Labels & Modal Escape Listener

**Learning:** Interactive items rendered inside repeated lists or drawers (like history records) often feature generic "Copy" or "Delete" button labels that lack context for screen readers. In addition, overlay drawers/modals need explicit `Escape` key listeners to allow keyboard-only users to easily dismiss overlays without searching for the close button.

**Action:** Always include contextual `aria-label`s specifying the target item (e.g., `aria-label={`Delete measurement ${r.formatted}`}`) for list action buttons and add a keyboard event listener for `Escape` on open drawer/modal dialogs.
