# Fix Vercel TypeScript build errors

Status legend: [ ] pending · [~] in progress · [x] done

- [x] Widen Combobox/RadioGroup onValueChange handlers in App.tsx and CarePanel
- [x] Replace chartRows.findLast with reverse().find in App.tsx
- [x] Remove stickyKeys and maxHeight from Chart Details Table usage
- [x] Run npm run build and confirm tsc passes

## Review

**Changed**
- `App.tsx` — Combobox `onValueChange` narrows `unknown` via `typeof`; `findLast` → `[...].reverse().find`; dropped unsupported `stickyKeys` / `maxHeight` on Table
- `CarePanel/index.tsx` — same Combobox narrowing; `handleTxTypeChange` accepts `unknown`

**Verified**
- `npm run build` (`tsc && vite build`) exits 0
