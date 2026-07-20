# 008 — Unify phase duration chip easings to one strong ease-out

- **Status**: DONE
- **Commit**: N/A (not a git repo)
- **Severity**: MEDIUM
- **Category**: Easing & cohesion
- **Estimated scope**: 1 file (`PhaseDuration.module.css`), ~10 lines

## Problem

The duration chip mixes two curves in one interaction:

- CSS keyword `ease-out` on color / opacity (weak for deliberate UI motion)
- Hand-rolled `cubic-bezier(0.22, 1, 0.36, 1)` on sizing (close to, but not the same as, the curve used elsewhere in the app)

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css — current excerpts */
transition:
  background-color 180ms ease-out,
  border-color 180ms ease-out,
  box-shadow 200ms ease-out,
  padding 200ms cubic-bezier(0.22, 1, 0.36, 1);

/* and */
transition:
  max-width 200ms cubic-bezier(0.22, 1, 0.36, 1),
  opacity 140ms ease-out,
  margin 200ms cubic-bezier(0.22, 1, 0.36, 1);
```

The product is a crisp clinical UI. One strong ease-out should own every enter/exit on this chip.

## Target

Use **exactly** this curve everywhere the duration chip transitions (except where plan **007** shortens reduced-motion durations):

```css
cubic-bezier(0.23, 1, 0.32, 1)
```

Do **not** leave any of these in `PhaseDuration.module.css` transition values:

- keyword `ease-out`
- keyword `ease`
- `cubic-bezier(0.22, 1, 0.36, 1)`

Example after plan **006** (adjust property lists to match whatever 006 left in place):

```css
.Chip {
  transition:
    background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    border-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.Collapsed {
  transition:
    grid-template-columns 200ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.Expanded {
  transition:
    grid-template-columns 220ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 160ms cubic-bezier(0.23, 1, 0.32, 1) 40ms;
}
```

If **006** is not applied yet, still replace every easing function in this file’s chip transitions with `cubic-bezier(0.23, 1, 0.32, 1)` while leaving property names (`max-width`, etc.) untouched — 006 will remove those properties later.

Durations stay as they are (140–220ms). Do not invent new timings.

## Repo conventions to follow

- Same curve already used for the chart header collapse in `src/App.tsx`:

```tsx
transition: 'grid-template-rows 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
```

- There is **no** shared `--ease-out` token file in this repo yet. Inline the cubic-bezier; do not create a new global tokens file unless a later plan asks for it.

## Steps

1. Open `src/components/TreatmentPlanView/PhaseDuration.module.css`.
2. Search for `ease-out`, `ease-in`, `ease`, and `cubic-bezier(0.22`.
3. Replace each match inside `.Chip` / `.Collapsed` / `.Expanded` (and reduced-motion opacity rules if present) with `cubic-bezier(0.23, 1, 0.32, 1)`.
4. Leave `EditButton` alone if it has no transition yet (plan **009** owns press feedback).

## Boundaries

- Do NOT change durations, delays (`40ms`), or which properties animate — only the easing function.
- Do NOT touch Select / Button / phase header CSS.
- Do NOT add a new dependency or motion library.
- If plan **006** already inlined this exact curve on all chip transitions, this plan is a **verify-only** pass: confirm zero leftover keyword `ease-out` / old bezier, then mark DONE with no diff.

## Verification

- **Mechanical**: `rg "ease-out|0\\.22, 1, 0\\.36" src/components/TreatmentPlanView/PhaseDuration.module.css` → no matches in transition values (comments OK).
- **Feel check**: open/close duration chip — motion should feel slightly snappier at the start (strong ease-out) vs the old keyword curve; no personality change toward bounce.
- **Done when**: every transition on `.Chip`, `.Collapsed`, and `.Expanded` uses `cubic-bezier(0.23, 1, 0.32, 1)` and no other easing function.
