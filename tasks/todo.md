# Clinical sidebar

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Implementation plan

- [x] Reuse the existing NavBar and icon set for the Figma navigation items
- [x] Mount the 64px sidebar below GlobalHeader and left of PatientHeader/workspace
- [x] Match the Figma rail geometry and active Clinical state
- [x] Build, lint, and verify the result in the browser

---

## Review

- Added a reusable ClinicalSidebar from the existing NavBar and icon primitives.
- The 64px rail starts immediately below the 32px GlobalHeader and remains left of PatientHeader and the clinical workspace.
- Clinical is exposed as the active/pressed navigation item; the rail scrolls independently when viewport height is constrained.
- Production build passes and edited files report no linter errors.
- Browser geometry at 1016×947: header 1016×32 at (0,0), sidebar 64×915 at (0,32), workspace 952×915 at (64,32).
