# 004 — Move Tabs indicator from left to translateX

- **Status**: TODO
- **Commit**: N/A (not a git repo)
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file (`src/components/Tabs/index.module.css`), ~6 lines

## Problem

The tab indicator animates `left` and `width` — both trigger layout on every frame. `left` is especially wasteful because `transform: translateX()` achieves the same visual positioning on the GPU.

```css
/* src/components/Tabs/index.module.css:113-117 — current */
.Indicator {
  position: absolute;
  background-color: var(--interactive-80);
  transition: left 150ms ease-out, width 150ms ease-out, top 150ms ease-out, height 150ms ease-out;
}
```

Base UI's `<Tabs.Indicator>` sets `--active-tab-left` and `--active-tab-width` as CSS custom properties on the element's inline style. The current CSS uses:

```css
/* lines 120-124 */
.indicatorSecondary {
  bottom: -1px;
  left: var(--active-tab-left);
  width: var(--active-tab-width);
  height: 3px;
}

/* lines 128-132 */
.indicatorTertiary {
  top: 0px;
  left: var(--active-tab-left);
  width: var(--active-tab-width);
  height: 3px;
}
```

## Target

Replace `left` positioning with `transform: translateX()`. Keep `width` in the transition — there's no GPU-only way to change element width, and on a 3px-tall bar the layout cost is negligible.

```css
/* target — shared */
.Indicator {
  position: absolute;
  left: 0;
  background-color: var(--interactive-80);
  transition: transform 150ms ease-out, width 150ms ease-out;
}

/* target — secondary */
.indicatorSecondary {
  bottom: -1px;
  transform: translateX(var(--active-tab-left));
  width: var(--active-tab-width);
  height: 3px;
}

/* target — tertiary */
.indicatorTertiary {
  top: 0px;
  transform: translateX(var(--active-tab-left));
  width: var(--active-tab-width);
  height: 3px;
}
```

## Repo conventions to follow

- The SegmentedButton indicator already uses `transform: translateX()` for positioning (`src/components/SegmentedButton/index.module.css:25`) — this change aligns the Tabs indicator with that pattern.
- `ease-out` at 150ms is already correct for this interaction frequency.

## Steps

1. Open `src/components/Tabs/index.module.css`.

2. In `.Indicator` (line ~113), change the transition and add `left: 0`:

   **From:**
   ```css
   .Indicator {
     position: absolute;
     background-color: var(--interactive-80);
     transition: left 150ms ease-out, width 150ms ease-out, top 150ms ease-out, height 150ms ease-out;
   }
   ```

   **To:**
   ```css
   .Indicator {
     position: absolute;
     left: 0;
     background-color: var(--interactive-80);
     transition: transform 150ms ease-out, width 150ms ease-out;
   }
   ```

3. In `.indicatorSecondary` (line ~120), replace `left` with `transform`:

   **From:**
   ```css
   left: var(--active-tab-left);
   ```

   **To:**
   ```css
   transform: translateX(var(--active-tab-left));
   ```

4. In `.indicatorTertiary` (line ~128), same change:

   **From:**
   ```css
   left: var(--active-tab-left);
   ```

   **To:**
   ```css
   transform: translateX(var(--active-tab-left));
   ```

## Boundaries

- Do NOT touch the Tabs component TSX file — only CSS.
- Do NOT change the indicator's visual appearance (color, size, border-radius).
- Do NOT modify the SegmentedButton or any other component.
- If the CSS vars `--active-tab-left` / `--active-tab-width` are no longer used this way (drift), STOP and report.

## Verification

- **Mechanical**: `npm run build` completes with no errors.
- **Feel check**: run the app, click between tabs (both secondary and tertiary variants):
  - The indicator should slide smoothly between tabs — same visual as before.
  - The indicator should be correctly positioned on page load (no flash or misalignment).
  - In DevTools Performance panel, record a tab switch. Confirm no Layout events during the transition frames (there may be one for `width`, but `left`-triggered layout should be gone).
  - Rapidly click between tabs — the transition should retarget from the current position, not jump.
- **Done when**: indicator slides correctly, `left` is no longer in the transition property, `transform: translateX()` is used for positioning.
