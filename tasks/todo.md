# Phase details pill — click-to-focus field

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Plan

- [x] Detect click region on collapsed chip (name vs duration)
- [x] Open editor focusing name input or hours select accordingly
- [x] Keep external open (Rename phase) focusing name
- [x] Verify in browser / build

---

## Approach

Keep the single collapsed button (tooltip + a11y). On click, use `closest` on `.DurationGroup` vs everything else. Store focus target in a ref; the existing open `useEffect` focuses name or hours. Reset target to `name` on close so menu-driven opens stay correct.

---

## Review

- Clicking the phase name (or edit icon / divider) opens the editor with the name field focused and selected.
- Clicking the clock / duration region opens the editor with the hours select focused.
- Rename phase (external open) still defaults to name focus.
- Verified in browser: name click → `Phase name` input; duration click → hours combobox (`hrs` field).
