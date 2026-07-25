# Remove ICD, Class I/V, and Supernumerary

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Delete ProcedureCodeCell + icdCodes; unexport; remove attachments from App + TreatmentPlanView
- [x] Remove restorativeClasses / icdEligible / allowsSupernumerary from CarePanel + API plumbing
- [x] Remove supernumerary switch, tooth slots, CSS, and App wiring
- [x] Confirm none/area/tooth/surface flows still work; lint/typecheck touched files
- [x] Fix Th/Area warning persisting after valid tooth entry (show committed tooth while waiting on surface)

---

## Review

- Deleted `ProcedureCodeCell` and `CarePanel/icdCodes.ts`; Class I/V pill and `+ ICD` UI are gone from chart + treatment plan description cells.
- Stripped `restorativeClasses` / `icdEligible` / `allowsSupernumerary` from ChipDef, DentalCode, API mapping; kept backend `isICDCodeMandatory` unused on the DTO.
- Removed odontogram Supernumerary switch, extra tooth slots, and related CSS.
- Kept `requires: 'none'` immediate finalize and area Th/Area dropdown path unchanged.
- Pending Th/Area now shows the entered tooth after commit (chart + treatment plan) instead of always rendering CautionIcon/`--`.
- `tsc --noEmit` clean.
