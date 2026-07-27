# Lessons

## Claude / agent hygiene
- Never commit `node_modules/.vite` cache churn — restore to base branch or add a real `.gitignore` before staging.
- Boolean UI wiring: when a checkbox means "show X", columns must use `showX ? cols : []`, not the inverted form — verify default-on state shows the columns.
- Popover `.Popup` only needs `padding-top`; Header/Body already own the rest — do not expand to full `padding`.
- SVG polygons with `tabIndex` keep a UA focus ring after click — `outline: none` on `:focus-visible` alone is not enough; set `outline: none` on the base + `:focus`, and `blur()` after pointer select when a filled selected state replaces the ring.
- Pending Th/Area cells: after a valid tooth commit advances to surface edit, render `row.thArea` (not CautionIcon/`--`). Warning placeholder is only for empty pending tooth fields.
- Pending area Th/Area: default to WarningIcon like tooth; mount Select only when `editingCell` is set (click). Do not auto-`setEditingCell` for `requires === 'area'` on add/change/advance — keep the dropdown click-gated. Use `defaultOpen` + `onOpenChange` to open the list on click and return to the warning if dismissed.
- Code-change Esc: snapshot the row in `handleCodeChange` before pending reset; Esc while `changingRowIds` restores the snapshot. Separate `onEscape` from blur/`onCancel` so empty blur only leaves the warning. Base UI Select reason is `'escape-key'`, not `'escapeKey'`.
- Figma frames made from screenshots are visual references, not acceptable reusable UI implementations. If the user asks for the actual component, locate the source design-system component and implement semantic, interactive elements; use raster assets only for genuinely photographic/image content.
