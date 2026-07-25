# Care Panel — 472px chip grid fit

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Set CarePanel wrapper to `47.2rem` (472px) in `App.tsx`
- [x] Sync appointment select positioner widths (467 → 472)
- [x] Make chip grid shrink: `min-width: 0` / `overflow: hidden` on `.Chip` + `.ChipGrid`
- [x] Verify in browser: 6 columns visible, no right-edge clip

---

## Review

**Changed**
- `src/App.tsx` — CarePanel shell width `50rem` → `47.2rem` (472px)
- `src/components/CarePanel/index.module.css` — appointment positioner 472px; Chip/ChipGrid shrink so 6 cols fit with ellipsis
- `src/components/CarePanel/index.tsx` — appointment `positionerStyle` 472

**Verified**
- Browser: panel width = 472px; all 6 first-row chips fully inside (Sealant visible)
- `grid.scrollWidth === clientWidth` (no horizontal overflow)
- Long labels ellipsize inside cells rather than forcing column overflow
