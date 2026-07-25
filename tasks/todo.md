# Proposed/Completed blur+tooltip notice

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Generalize tab-change notice helper so Tx Type can reuse it
- [x] Show blur+tooltip when switching Proposed ↔ Completed
- [x] Use proper user-facing copy for tab and Tx Type notices
- [x] Keep existing status-ripple on Tx Type change
- [x] Verify interaction matches New Treatment ↔ Existing

---

## Review

- `showChangeNotice(message)` shared by tab and Tx Type switches.
- Proposed ↔ Completed shows the same chip-grid blur + tooltip overlay as New Treatment ↔ Existing.
- Copy: "Switched to Proposed" / "Switched to Completed" (and "Switched to New Treatment" / "Switched to Existing" for tabs).
- Status ripple on Tx Type change unchanged.
