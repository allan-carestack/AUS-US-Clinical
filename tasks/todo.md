# Global header responsive overflow correction

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Reproduce the sticky More state and capture layout measurements
- [x] Make overflow recovery use stable available-width measurements
- [x] Reduce More to its compact content width
- [x] Run build and lint checks
- [x] Verify narrow-to-wide resizing restores every quick action

---

## Review

- Replaced the hard-coded 56px overflow reservation with a hidden natural-width probe.
- More now uses its content width (39.64px in browser verification) instead of a fixed 56px.
- At 1016px, Patient through Memo remain visible with compact More.
- At 1240px, Message also remains visible with compact More.
- At 1280px, all eight quick actions are restored and More is removed.
- Production build passes; edited header files report no linter errors.
