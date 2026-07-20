# Tx plan phase code targeting

Status legend: [ ] pending · [~] in progress · [x] done

- [x] Lift plansById + targetPhaseByPlan into App; seed from mock clones
- [x] Branch applyEntry / +code / tooth-first into target phase; pendingProcedureIds
- [x] Odontogram finalize oldest pending plan procedure when on plan tab
- [x] Controlled TreatmentPlanView: banner, phase click selects target, pending row UI

## Review

**Changed**
- `TreatmentPlanView/mockData.ts` — `codeId`/`requires` on procedures; `cloneTreatmentPlanMock`, `seedPlansById`, `firstPhaseId`
- `App.tsx` — `plansById` + `targetPhaseByPlan` + `pendingProcedureIds`; care-panel/+code route into selected phase when a plan tab is active; odontogram/keyboard finalize for pending plan rows
- `TreatmentPlanView/index.tsx` — controlled `plan`/`targetPhaseId`; phase header selects drop target; “Codes will be added here” banner; pending orange rows with caution/edit/delete
- `TreatmentPlanView/index.module.css` — pending row styles; phase header cursor

**Verified (browser)**
- All on 4 Tx: Phase 1 shows “Codes will be added here”
- Exams chip → prepends into Phase 1; Chart Details unchanged
- Click Phase 2 → banner moves; Denture lands in Phase 2 only
- +Code 661 → orange pending in Phase 2; tooth 18 click fills Th/Area and clears pending
