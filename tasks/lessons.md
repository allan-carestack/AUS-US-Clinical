# Lessons

## Claude / agent hygiene
- Never commit `node_modules/.vite` cache churn — restore to base branch or add a real `.gitignore` before staging.
- Boolean UI wiring: when a checkbox means "show X", columns must use `showX ? cols : []`, not the inverted form — verify default-on state shows the columns.
- Popover `.Popup` only needs `padding-top`; Header/Body already own the rest — do not expand to full `padding`.
- SVG polygons with `tabIndex` keep a UA focus ring after click — `outline: none` on `:focus-visible` alone is not enough; set `outline: none` on the base + `:focus`, and `blur()` after pointer select when a filled selected state replaces the ring.
- Pending Th/Area cells: after a valid tooth commit advances to surface edit, render `row.thArea` (not CautionIcon/`--`). Warning placeholder is only for empty pending tooth fields.
