# 007 — Keep opacity feedback under prefers-reduced-motion on duration chip

- **Status**: DONE
- **Commit**: N/A (not a git repo)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (`PhaseDuration.module.css`), ~15 lines

## Problem

Reduced-motion currently nukes **all** transitions on the duration chip, including opacity. Users who prefer reduced motion still benefit from a short fade that explains the collapsed ↔ editor state change; only positional/sizing motion should be removed.

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css:175-180 — current */
@media (prefers-reduced-motion: reduce) {
  .Chip,
  .Collapsed,
  .Expanded {
    transition: none;
  }
}
```

After plan **006**, `.Collapsed` / `.Expanded` may also transition `grid-template-columns`. That movement must be disabled under reduced motion; opacity should remain.

## Target

```css
/* PhaseDuration.module.css — target */
@media (prefers-reduced-motion: reduce) {
  .Chip {
    transition:
      background-color 120ms cubic-bezier(0.23, 1, 0.32, 1),
      border-color 120ms cubic-bezier(0.23, 1, 0.32, 1);
    /* no box-shadow movement/elevation animation */
  }

  .Collapsed,
  .Expanded {
    transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1) !important;
    /* kill grid (or legacy max-width) sizing motion */
    transition-property: opacity;
  }

  .ChipOpen .Collapsed,
  .ChipOpen .Expanded,
  .Collapsed,
  .Expanded {
    /* Instant size; opacity still fades via the rule above */
    grid-template-columns: unset;
  }

  .Collapsed {
    grid-template-columns: 1fr;
  }

  .ChipOpen .Collapsed {
    grid-template-columns: 0fr;
    transition: none; /* size snap; opacity handled when not open-only — see note */
  }

  .Expanded {
    grid-template-columns: 0fr;
  }

  .ChipOpen .Expanded {
    grid-template-columns: 1fr;
  }
}
```

Simpler, preferred target (use this — clearer for executors):

```css
@media (prefers-reduced-motion: reduce) {
  .Chip {
    transition-duration: 0.01ms !important;
    transition-property: background-color, border-color;
  }

  .Collapsed,
  .Expanded {
    transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  /* Size changes apply immediately — override any grid/max-width duration */
  .Collapsed,
  .Expanded,
  .ChipOpen .Collapsed,
  .ChipOpen .Expanded {
    transition-property: opacity;
  }
}
```

If plan **006** has not been applied and the file still uses `max-width`, the same rule works: only `opacity` remains in `transition-property`, so `max-width` / `margin` jump instantly while the fade runs.

Match the Popover pattern in this repo:

```css
/* exemplar — src/components/Popover/index.module.css:28-36 */
@media (prefers-reduced-motion: reduce) {
  & {
    transition-duration: 0.01ms !important;
  }
  &[data-starting-style],
  &[data-ending-style] {
    transform: none;
  }
}
```

## Repo conventions to follow

- Prefer “fewer / gentler animations”, not zero — see `plans/003-prefers-reduced-motion.md` and Popover/Tooltip reduced-motion blocks.
- Curve for remaining opacity: `cubic-bezier(0.23, 1, 0.32, 1)` (same as plan 006 / App collapsible).

## Steps

1. Open `src/components/TreatmentPlanView/PhaseDuration.module.css`.
2. Replace the existing `@media (prefers-reduced-motion: reduce)` block with the **simpler preferred target** above.
3. If `.CollapsedInner` / `.ExpandedInner` exist and have their own transitions, add them to the reduce block with `transition: none` (inners should not animate independently).

## Boundaries

- Do NOT remove the reduced-motion media query entirely.
- Do NOT change open/close behavior in `PhaseDuration.tsx`.
- Do NOT alter Select popup reduced-motion (owned by shared popup CSS).
- Prefer running **after** plan **006** so class names match; if 006 is not done, still apply `transition-property: opacity` to `.Collapsed` / `.Expanded`.

## Verification

- **Mechanical**: DevTools → Rendering → “Emulate CSS media feature prefers-reduced-motion: reduce”.
- **Feel check**:
  - Open the duration chip: editor should appear with a short opacity fade; width/grid should snap with no visible slide.
  - Close/cancel: same — fade only.
  - With reduced motion off, full morph from plan 006 (or legacy max-width morph) still runs.
- **Done when**: under reduced motion, `getComputedStyle` on `.Expanded` during open shows a non-`none` transition that includes `opacity`, and sizing props are not interpolated over hundreds of ms.
