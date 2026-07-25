# ChipGridArea tab slide-in + change notice

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] On tab switch, slide ChipGridArea in (Existing ← left, New Treatment ← right)
- [x] Skip animation on initial mount; respect prefers-reduced-motion
- [x] Outgoing ChipGridArea: subtle blur + opposite slide while incoming enters
- [x] Centered tooltip + blur overlay over chip grid on tab change
- [x] Auto-dismiss notice (~1.4s hold + fade out); restart on rapid toggles

---

## Review

- Overlay: light white veil + `backdrop-filter: blur(2.5px)` over `.ChipGridStage`.
- Tooltip copy: `CarePanel changed to New Treatment` / `… Existing` (matches Tooltip grey-80 styling).
- `aria-live="polite"` + `role="status"` for the confirmation.
- Reduced-motion: no blur/scale animations; stronger opaque veil instead.
