# Existing filter chip tooltip

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Write checkable plan items to tasks/todo.md
- [x] Wrap Existing FilterChip with Tooltip + UX copy in TxLogFilters
- [x] Verify hover shows tooltip; mark todo complete + review notes

---

## Review

- Existing visible-row chip wrapped with `Tooltip` in `TxLogFilters`.
- Copy: "Includes existing treatments and conditions." (sentence case helper text per UXcopy.md).
- Confirmed in DOM: Pills-row Existing button has `data-base-ui-tooltip-trigger` (Base UI Tooltip wired). Measure row and More-filters menu left unchanged.
