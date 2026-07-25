# CarePanel chips → pending tx-log rows

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Add `ChartEntry.requires` + `resolveRowChip` for chip/CDT pending finalize
- [x] Rewrite `handleChipSelect` to insert pending rows like +Code (chart + plan)
- [x] Remove chip `pendingSelection`, blue banner, `armedChipId` wiring
- [x] Verify tooth/surface/none, tooth-first, plan tab, +Code unchanged

---

## Review

**Changed**
- `src/App.tsx` — chip-first no longer arms chips / shows blue banner; inserts pending Chart Details rows (or pending plan procedures) mirroring +Code. `ChartEntry.requires` + `resolveRowChip` let chip slugs finalize via odontogram or keyboard.

**Verified (browser)**
- Bridge Abutment → orange pending row “Bridge Abutment — select a tooth”; no blue banner; chip not armed
- Tooth 11 click → row becomes “Tooth 11 — Bridge Abutment”, pending cleared
- X-Rays (`requires: 'none'`) → completed row immediately (no pending affordance)
- `tsc --noEmit` clean
