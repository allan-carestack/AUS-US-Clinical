# Auto-expand collapsed target phase on code add

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Plan

- [x] Expand target phase when its procedure count grows
- [x] Verify: collapse selected phase → add chip/code → phase opens showing new row

---

## Approach

In `TreatmentPlanView`, watch the target phase’s procedure count. When it increases, add that phase to `expandedPhases`. Covers both pending inserts and immediate (`requires: 'none'`) adds. Selecting a target already expands; this covers collapsing the still-selected target then adding a code.

---

## Review

- Collapsed selected Phase 1 + Exams chip → phase expands; new Exams row visible at top.
- Non-target phases stay collapsed.
