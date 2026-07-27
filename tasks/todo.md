# Edit plan details modal

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Build EditPlanDetailsDialog from Figma using Dialog/Field/Select/Checkbox/Button
- [x] Open modal from plan-name edit button (replace inline rename)
- [x] Verify open/close, plan name save, required fields

---

## Review

- Added `EditPlanDetailsDialog` matching Figma node 2748:144289: header, Plan Name, Presented Location, Diagnosed Conditions, Coordinator + lock checkbox, disabled Plan Alternative to, Cancel/Create.
- Reuses Dialog, Field, Label, Select, Checkbox, Button.
- Plan header pencil opens the modal; Create saves plan name via `onPlanLabelChange`.
- Verified in browser: modal opens over plan view with correct location label.
