# 006 — Drive phase duration chip morph with grid + opacity (no max-width)

- **Status**: DONE
- **Commit**: N/A (not a git repo)
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files (`PhaseDuration.module.css`, `PhaseDuration.tsx`), ~40 lines

## Problem

The duration chip next to each phase name morphs open by transitioning **layout properties** — `max-width`, `margin`, and `padding` — for ~200–220ms. Those properties trigger layout + paint on every frame while the absolute chip grows over `PhaseLeft` siblings (phase name, InfoChip).

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css:44-48 — current */
  transition:
    background-color 180ms ease-out,
    border-color 180ms ease-out,
    box-shadow 200ms ease-out,
    padding 200ms cubic-bezier(0.22, 1, 0.36, 1);
```

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css:72-80 — current */
.Collapsed {
  gap: var(--spacing-4);
  max-width: 12rem;
  opacity: 1;
  transition:
    max-width 200ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 140ms ease-out,
    margin 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css:89-97 — current */
.Expanded {
  gap: var(--spacing-12);
  max-width: 0;
  opacity: 0;
  pointer-events: none;
  transition:
    max-width 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease-out 40ms;
}
```

Keep the existing interaction model: collapsed footprint via `.Sizer`, chip overlays neighbors when open, `transform-origin: left center`.

## Target

1. Stop transitioning `max-width`, `margin`, and `padding`.
2. Collapse / expand each pane with **`grid-template-columns: 0fr` ↔ `1fr`** (same pattern as plan 001’s row collapse) plus **opacity**.
3. Apply padding on `.ChipOpen` instantly (no transition).
4. Use one strong ease-out curve for the morph: `cubic-bezier(0.23, 1, 0.32, 1)`.

Markup — wrap the contents of `.Collapsed` and `.Expanded` so the grid fraction can clip an inner flex row:

```tsx
/* PhaseDuration.tsx — target structure (class names only; keep all existing props/handlers) */
<div className={styles.Collapsed} aria-hidden={open}>
  <div className={styles.CollapsedInner}>
    <span className={...}>{formatDuration(value)}</span>
    <button type="button" className={styles.EditButton} ...>
      <RenameIcon />
    </button>
  </div>
</div>

<div className={styles.Expanded} aria-hidden={!open} inert={!open || undefined}>
  <div className={styles.ExpandedInner}>
    {/* existing Field / Actions unchanged */}
  </div>
</div>
```

```css
/* PhaseDuration.module.css — target */

.Chip {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  height: 2.4rem;
  min-height: 2.4rem;
  padding: 0 var(--spacing-4);
  border: 1px solid transparent;
  border-radius: var(--radius-default);
  background: var(--grey-10);
  box-shadow: none;
  overflow: hidden;
  transform-origin: left center;
  transition:
    background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    border-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 200ms cubic-bezier(0.23, 1, 0.32, 1);
  /* no padding in the transition list */
}

.ChipOpen {
  height: auto;
  overflow: visible;
  padding: var(--spacing-4) var(--spacing-8);
  background: var(--white);
  border-color: var(--grey-20);
  box-shadow:
    0 4px 4px 0 rgba(0, 0, 0, 0.08),
    0 8px 12px -4px rgba(0, 0, 0, 0.08);
}

.Collapsed {
  display: grid;
  grid-template-columns: 1fr;
  opacity: 1;
  transition:
    grid-template-columns 200ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.ChipOpen .Collapsed {
  grid-template-columns: 0fr;
  opacity: 0;
  pointer-events: none;
}

.CollapsedInner {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.Expanded {
  display: grid;
  grid-template-columns: 0fr;
  opacity: 0;
  pointer-events: none;
  transition:
    grid-template-columns 220ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 160ms cubic-bezier(0.23, 1, 0.32, 1) 40ms;
}

.ChipOpen .Expanded {
  grid-template-columns: 1fr;
  opacity: 1;
  pointer-events: auto;
  overflow: visible;
}

.ExpandedInner {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.ChipOpen .ExpandedInner {
  overflow: visible;
}
```

Remove the old shared rule that set `max-width` / flex display on `.Collapsed, .Expanded` together if it conflicts — keep `transform-origin: left center` on `.Chip` only.

Leave the `@media (prefers-reduced-motion: reduce)` block for plan **007** (do not “fix” it here beyond ensuring new class names still appear in that selector list if you touch it).

## Repo conventions to follow

- Collapsible GPU pattern already used in `src/App.tsx` (grid `0fr`/`1fr` + opacity) and documented in `plans/001-collapsible-panel-gpu-animation.md`.
- Strong ease-out curve in that exemplar: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Keep `.Sizer` — it is what prevents the phase row from jumping when the chip overlays content.

## Steps

1. In `PhaseDuration.tsx`, wrap collapsed label+pencil in `<div className={styles.CollapsedInner}>`, and wrap expanded fields+actions in `<div className={styles.ExpandedInner}>`. Do not change open/apply/dismiss logic.
2. In `PhaseDuration.module.css`, replace `.Collapsed` / `.Expanded` / `.Chip` transition rules with the target CSS above. Delete `max-width`, `margin` transitions and any `margin: 0` open override that only existed for the old morph.
3. Confirm `.ChipOpen` still sets `overflow: visible` so Select focus rings and popups are not clipped.
4. Smoke-check: open duration on Phase 1, Phase 2, Phase 3 independently; neighbors must not shift (`.Sizer`); chip still grows left→right over the row.

## Boundaries

- Do NOT change Select/Menu/Button behavior or focus management in `PhaseDuration.tsx`.
- Do NOT restyle the phase header (`index.module.css`) or InfoChip.
- Do NOT add Framer Motion or other dependencies.
- Do NOT “fix” reduced-motion semantics here — that is plan **007** (you may add `.CollapsedInner` / `.ExpandedInner` to the reduce selector only if needed to avoid leftover transitions).
- If the TSX structure has drifted and there is no `.Collapsed` / `.Expanded` pair, STOP and report.

## Verification

- **Mechanical**: app loads; open Treatment Plan → any phase → Edit duration; no console errors.
- **Feel check**:
  - Open/close the chip — motion should feel similar in timing (~200ms) but smoother (less jank while InfoChip is on-screen).
  - In DevTools Performance, record open: you should not see continuous layout on `max-width` for Collapsed/Expanded.
  - Spam open/close — animation should retarget (CSS transitions), not restart from a keyframe zero.
  - Animations panel @ 10%: grid columns and opacity interpolate; padding on open should snap, not ease.
- **Done when**: no `max-width` / `margin` / `padding` appear in any `transition` on `.Chip`, `.Collapsed`, or `.Expanded`; open/close still usable on every phase row.
