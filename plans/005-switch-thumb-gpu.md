# 005 — Move Switch thumb from left to translateX

- **Status**: TODO
- **Commit**: N/A (not a git repo)
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file (`src/components/Switch/index.module.css`), ~4 lines

## Problem

The Switch thumb animates `left` to slide between unchecked (`0.2rem`) and checked (`calc(3.2rem - 1.4rem - 0.2rem)` = `1.6rem`). `left` triggers layout on every frame. This is a high-frequency element (toggled 100+/day in a clinical app) — it should use GPU-composited `transform: translateX()`.

```css
/* src/components/Switch/index.module.css:56-69 — current */
.Thumb {
  position: absolute;
  left: 0.2rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background-color: var(--white);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.20);
  transition: left 100ms ease-out;

  &[data-checked] {
    left: calc(3.2rem - 1.4rem - 0.2rem);
  }
}
```

## Target

Keep `left: 0.2rem` as the base position. Use `transform: translateX()` for the checked offset. The travel distance is `1.6rem - 0.2rem = 1.4rem` (from the unchecked left edge to the checked left edge).

```css
/* target */
.Thumb {
  position: absolute;
  left: 0.2rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background-color: var(--white);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.20);
  transition: transform 100ms ease-out;

  &[data-checked] {
    transform: translateX(1.4rem);
  }
}
```

The travel distance: checked position is `calc(3.2rem - 1.4rem - 0.2rem)` = `1.6rem`. Unchecked position is `0.2rem`. Delta = `1.6rem - 0.2rem` = `1.4rem`. So `translateX(1.4rem)` from the base `left: 0.2rem` lands at the same spot.

## Repo conventions to follow

- The SegmentedButton indicator already uses `transform: translateX()` for sliding (`src/components/SegmentedButton/index.module.css:25`).
- Duration (100ms) and easing (`ease-out`) stay unchanged — appropriate for this high-frequency toggle.

## Steps

1. Open `src/components/Switch/index.module.css`.

2. In `.Thumb` (line ~56), change the transition property:

   **From:**
   ```css
   transition: left 100ms ease-out;
   ```

   **To:**
   ```css
   transition: transform 100ms ease-out;
   ```

3. In the `&[data-checked]` block, replace `left` with `transform`:

   **From:**
   ```css
   &[data-checked] {
     left: calc(3.2rem - 1.4rem - 0.2rem);
   }
   ```

   **To:**
   ```css
   &[data-checked] {
     transform: translateX(1.4rem);
   }
   ```

## Boundaries

- Do NOT touch the Switch component TSX file — only CSS.
- Do NOT change the thumb's size, color, or shadow.
- Do NOT modify the track (`.Root`) styles.
- If the `left` values don't match (drift — different track width, thumb size), recalculate the `translateX` delta as `(track-width - thumb-width - padding) - padding` and STOP to report the new value.

## Verification

- **Mechanical**: `npm run build` completes with no errors.
- **Feel check**: run the app, toggle a Switch on and off:
  - The thumb should slide to the same positions as before — pixel-identical.
  - The transition should feel the same (100ms, ease-out).
  - In DevTools Performance panel, record a toggle. Confirm no Layout events during the transition frames.
  - Rapidly toggle 10 times — the thumb should retarget smoothly from current position, no jumping.
  - Verify the checked thumb aligns with the right edge of the track (0.2rem inset from the right).
- **Done when**: `left` is no longer in the transition property; `transform: translateX(1.4rem)` positions the checked thumb correctly; no layout thrash on toggle.
