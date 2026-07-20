# Animation Improvement Plans

Prioritized plans from the `improve-animations` audit. Each plan is self-contained and can be executed by any agent or developer independently.

## Plans

| # | Title | Severity | Category | Status |
|---|-------|----------|----------|--------|
| 001 | [Replace height animation with GPU-composited collapse](001-collapsible-panel-gpu-animation.md) | HIGH | Performance | DONE |
| 002 | [Fix scale(0) on Radio and Checkbox indicators](002-radio-checkbox-scale-zero.md) | HIGH | Physicality | DONE |
| 003 | [Add prefers-reduced-motion support](003-prefers-reduced-motion.md) | MEDIUM | Accessibility | DONE |
| 004 | [Move Tabs indicator from left to translateX](004-tabs-indicator-gpu.md) | MEDIUM | Performance | DONE |
| 005 | [Move Switch thumb from left to translateX](005-switch-thumb-gpu.md) | MEDIUM | Performance | DONE |
| 006 | [Drive phase duration chip morph with grid + opacity](006-phase-duration-gpu-morph.md) | HIGH | Performance | DONE |
| 007 | [Keep opacity under prefers-reduced-motion on duration chip](007-phase-duration-reduced-motion.md) | MEDIUM | Accessibility | DONE |
| 008 | [Unify phase duration chip easings](008-phase-duration-easing-cohesion.md) | MEDIUM | Easing & cohesion | DONE |
| 009 | [Add press scale on duration chip pencil](009-phase-duration-edit-press.md) | LOW | Physicality | DONE |

## Recommended execution order

### Earlier batch (already done)

1. **002** → **005** → **004** → **001** → **003**

### Phase duration chip batch (new)

1. **006** first — structural morph change (grid + opacity); largest feel/perf win
2. **008** next — verify/replace easings (often a no-op if 006 already inlined the curve)
3. **007** next — reduced-motion must see the post-006 class/transition shape
4. **009** last — independent pencil press feedback; no dependency on 006–008

## Dependencies

- **006** is independent of 001–005; touches only `PhaseDuration.*`.
- **008** should run after **006** (or as verify-only if 006 already set `cubic-bezier(0.23, 1, 0.32, 1)` everywhere).
- **007** should run after **006** so reduced-motion targets `grid-template-columns` + opacity correctly.
- **009** is independent — can run anytime.

## Execute

From a capable agent session:

```text
improve-animations execute plans/006-phase-duration-gpu-morph.md
```

Or hand any single `plans/00N-*.md` file to an executor with instructions to follow it exactly and not expand scope.
