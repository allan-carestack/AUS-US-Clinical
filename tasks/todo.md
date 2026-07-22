# Fix Claude branch bugs

Status legend: [ ] pending · [~] in progress · [x] done

- [x] Invert fee-column visibility: show when `showFeeEstimates` is true
- [x] Revert accidental Popover full padding → `padding-top` only
- [x] Restore `node_modules/.vite` to match `main` (undo cache churn commit)
- [x] Add `prefers-reduced-motion` for new pill / chip width transitions
- [x] Verify with build / spot-check

## Review

**Changed**
- `src/App.tsx` — `showFeeEstimates ? feeCols : []` (was inverted `!showFeeEstimates`)
- `src/components/Popover/index.module.css` — restore `padding-top` only (Header/Body already pad)
- `src/components/TxLogFilters/index.module.css` + `FilterChip/index.module.css` — disable width/collapse transitions under `prefers-reduced-motion`
- staged: `node_modules/.vite` reset to `main` (removes Vite dep hash churn from `5be4d89`)

**Verified**
- `npm run build` (`tsc && vite build`) exits 0
