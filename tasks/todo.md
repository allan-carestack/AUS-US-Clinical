# DatePicker day cell + ghost nav polish

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Month nav buttons → `variant="ghost"`
- [x] Day cells `2.4rem` (24px) with `--radius-default`
- [x] Outside-month cells show adjacent dates, same color, `opacity: 0.4`, disabled
- [x] Verify in browser

---

## Review

- Nav: `Button variant="ghost" iconOnly`.
- Day buttons: `24×24px`, `border-radius: var(--radius-default)`.
- Outside-month pads show real adjacent dates (e.g. Nov 30 / Jan 1–3 for Dec 2025), same `grey-100` as in-month days, `opacity: 0.4`, `disabled`.
- Verified via CDP: day `24px`, radius `6px`, outside opacity `0.4`, nav has `_ghost_` class.
