# Treatment Planner tab

Status legend: [ ] pending · [~] in progress · [x] done · [?] needs decision

---

## Pending-row delete beside status

- [x] Reuse `secondary-destructive-ghost` for the Treatment Plan pending delete
- [x] Place delete next to Status and widen the Status column
- [x] Verify layout, build, and lints

---

## Plan pending Th/Area matches Chart

- [x] Stop auto-opening Th/Area input on plan chip/+Code adds
- [x] Keep warning until click; verify build

---

## Tx-plan history synchronization

- [x] Trace plan-add, pending-edit, finalize, and delete ownership across both tables
- [x] Mirror newly added plan procedures into Chart Details with Tx Plan and Phase metadata
- [x] Keep pending completion and deletion synchronized between Chart Details and the source plan
- [x] Verify chip/code entry paths, switching tabs, metadata, completion, deletion, build, and lints

---

## Pending-row motion

- [x] Keep deleted pending rows mounted through their exit transition
- [x] Add coordinated 240ms enter and exit animations
- [x] Verify add/delete timing, final row removal, reduced motion, build, and lints

---

## Tab-bar continuity fix

- [x] Trace the tab-bar DOM ownership and coordinated CarePanel transition
- [x] Keep one mounted workspace tab bar across Chart and Treatment Planner
- [x] Animate that bar's available width with the CarePanel entering and leaving
- [x] Verify rapid switching, final geometry, reduced motion, build, and lints

---

## Implementation plan

- [x] Control the top Chart and Treatment Planner tabs
- [x] Open Treatment Planner on the existing All on 4 Tx plan
- [x] Reuse the live treatment-plan state and TreatmentPlanView
- [x] Match the Figma split workspace and compact 1020px table
- [x] Build, lint, and verify synchronization in the browser
- [x] Animate the CarePanel out to the right and restore it on return
- [x] Animate the workspace tab bar width with the CarePanel transition

---

## Review

- Treatment Planner is now a controlled workspace tab and always targets `all-on-4`.
- Chart and Treatment Planner render the same `plansById` entry and mutation handlers; no duplicate plan store was introduced.
- At the 1366×900 Figma viewport, the planner sidebar is 258px, the plan pane is 1044px, the compact table is 1020px, and the footer is pinned at the viewport bottom.
- Browser verification added an Exams procedure from the Chart-side All on 4 plan, confirmed it in Treatment Planner, then confirmed it remained after switching back.
- Production build passes; edited TypeScript and CSS files report no linter errors.
- CarePanel now stays mounted and slides toward its right edge over 240ms when Treatment Planner opens, then retraces the same path when Chart returns.
- The workspace tab bar is a single persistent DOM node whose containing column resizes in sync with the CarePanel.
- Reduced-motion users receive the same final layouts without spatial animation.

### Pending-row delete beside status

- Pending delete uses the shared error ghost button and sits beside the Status tag.
- Status column widened from 9.6rem to 12.8rem so the badge and action fit.

### Plan pending Th/Area matches Chart

- Chip and +Code adds under an active plan no longer auto-open the Th/Area input.
- Pending rows show the warning until click, same as Chart Details.

### Tx-plan history synchronization

- Plan procedures remain canonical; Chart Details projects only user-added procedure IDs into history rows with live plan/phase metadata.
- Both care-panel chip selection and direct code search populate the Tx Plan and Phase columns and preserve pending-row behavior.
- Completing tooth, surface, or area input from either view mutates the canonical plan procedure, so the other view updates without a second stored copy.
- Deleting a pending row from either view removes the canonical procedure and its history ID; plan and phase labels remain live projections.
- Browser verification covered an Implant chip and code `664`, confirmed `All on 4 Tx` / `Phase 1`, completed tooth `12` from Chart Details, and verified synchronized deletion.
- Production build passes; edited TypeScript reports no linter errors.

### Pending-row motion

- New pending rows fade and lift into place over 240ms.
- Delete marks the row as exiting, disables interaction, runs the matching 240ms exit, and removes the data only after the animation window.
- Browser inspection confirmed the enter/exit animation names and `0.24s` computed durations; the temporary verification rows were removed.
- Reduced-motion users skip both the spatial animation and delayed removal.
- Production build passes; edited TypeScript and CSS files report no linter errors.

### Tab-bar continuity fix

- Removed the duplicate Chart/Planner tab-bar render sites and the snapshot-based View Transition that made both bars visible during the crossfade.
- At the 1016px verification viewport, the same tab-bar node resized from 480px beside the 472px CarePanel to 952px in Treatment Planner and back to 480px.
- Frame sampling confirmed one tab list throughout the transition, preserved DOM identity, a 240ms width/transform settle, and correct final selected states in both directions.
- Rapid reversal kept one tab list and returned to the correct 480px Chart width.
- Production build passes; edited TypeScript and CSS files report no linter errors.
