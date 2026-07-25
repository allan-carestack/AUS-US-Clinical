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

- Overlay split: static `.ChipGridChangeBlur` (opacity always 1) + fading veil/tooltip siblings.
- Avoids backdrop-root bug from animating opacity on the `backdrop-filter` node.
- Tooltip copy: `CarePanel changed to New Treatment` / `… Existing`.
- Reduced-motion: no blur; stronger opaque veil instead.
