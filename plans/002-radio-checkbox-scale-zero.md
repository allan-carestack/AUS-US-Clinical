# 002 — Fix scale(0) on Radio and Checkbox indicators

- **Status**: TODO
- **Commit**: N/A (not a git repo)
- **Severity**: HIGH
- **Category**: Physicality
- **Estimated scope**: 2 files, ~8 lines each

## Problem

Both the Radio and Checkbox indicator elements enter and exit from `scale(0)` — the element materializes from nothing. Nothing in the real world appears from a singularity. The standard is to start from `scale(0.8–0.97)` paired with `opacity: 0` so the element fades in while growing slightly, giving it a physical origin.

```css
/* src/components/Radio/index.module.css:57-71 — current */
.Indicator {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background-color: var(--interactive-80);
  transition: transform 120ms ease-out;

  &[data-starting-style] {
    transform: scale(0);
  }

  &[data-ending-style] {
    transform: scale(0);
  }
}
```

```css
/* src/components/Checkbox/index.module.css:55-69 — current */
.Indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--white);
  transition: transform 120ms ease-out;

  &[data-starting-style] {
    transform: scale(0);
  }

  &[data-ending-style] {
    transform: scale(0);
  }
}
```

## Target

Replace `scale(0)` with `scale(0.8)` + `opacity: 0` on both components. Add `opacity` to the transition property list so the fade is animated.

```css
/* Radio — target */
.Indicator {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background-color: var(--interactive-80);
  transition: transform 120ms ease-out, opacity 120ms ease-out;

  &[data-starting-style] {
    transform: scale(0.8);
    opacity: 0;
  }

  &[data-ending-style] {
    transform: scale(0.8);
    opacity: 0;
  }
}
```

```css
/* Checkbox — target */
.Indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--white);
  transition: transform 120ms ease-out, opacity 120ms ease-out;

  &[data-starting-style] {
    transform: scale(0.8);
    opacity: 0;
  }

  &[data-ending-style] {
    transform: scale(0.8);
    opacity: 0;
  }
}
```

## Repo conventions to follow

- Both files use nested `&[data-starting-style]` / `&[data-ending-style]` selectors — this is the Base UI pattern used throughout the codebase (see `src/components/Tooltip/index.module.css:15-18`, `src/components/Popover/index.module.css:22-25`).
- The Tooltip already uses the correct pattern: `scale(0.90)` + `opacity: 0`.
- Duration (120ms) and easing (`ease-out`) stay unchanged — they're appropriate for these small, high-frequency elements.

## Steps

1. Open `src/components/Radio/index.module.css`. Find the `.Indicator` rule (approximately line 57).

2. Change the `transition` property from:
   ```css
   transition: transform 120ms ease-out;
   ```
   To:
   ```css
   transition: transform 120ms ease-out, opacity 120ms ease-out;
   ```

3. In the `&[data-starting-style]` block, change:
   ```css
   transform: scale(0);
   ```
   To:
   ```css
   transform: scale(0.8);
   opacity: 0;
   ```

4. In the `&[data-ending-style]` block, make the same change:
   ```css
   transform: scale(0);
   ```
   To:
   ```css
   transform: scale(0.8);
   opacity: 0;
   ```

5. Open `src/components/Checkbox/index.module.css`. Find the `.Indicator` rule (approximately line 55). Repeat steps 2–4 identically.

## Boundaries

- Do NOT touch the Radio or Checkbox markup/structure.
- Do NOT change durations or easing — only the transform start value and add opacity.
- Do NOT modify any other component.
- If the `scale(0)` values are no longer present in the files (drift), STOP and report.

## Verification

- **Mechanical**: `npm run build` completes with no errors.
- **Feel check**: run the app, click a radio button and a checkbox:
  - The indicator should fade in while growing slightly from 80% size — it should feel like it "appears" rather than "pops from nothing."
  - The exit should be the reverse — shrinks slightly while fading out.
  - In DevTools Animations panel, set playback to 10%. Confirm:
    - The indicator is visible at the start of the animation (not invisible until the final frame).
    - The scale goes from 0.8 → 1.0, not 0 → 1.0.
    - Opacity goes from 0 → 1 simultaneously.
  - Rapidly click a radio button on/off 5 times — the transition should not glitch or jump.
- **Done when**: no `scale(0)` remains in either file; both indicators enter/exit from `scale(0.8)` + `opacity: 0`.
