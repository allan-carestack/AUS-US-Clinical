# 003 — Add prefers-reduced-motion support

- **Status**: TODO
- **Commit**: N/A (not a git repo)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 new file + 12 component CSS files, ~30 lines total

## Problem

The entire codebase has zero `prefers-reduced-motion` support. Every transform-based animation plays regardless of the user's OS accessibility setting. This is an accessibility requirement — users who experience motion sickness or vestibular disorders set this preference to avoid nausea-inducing movement.

The affected components with transform-based motion:
- `src/components/Tooltip/index.module.css` — `scale(0.90)` entry
- `src/components/Popover/index.module.css` — `scale(0.95)` entry
- `src/components/Dialog/index.module.css` — `scale(0.96) translateY(0.8rem)` entry
- `src/components/Drawer/index.module.css` — `translateX(-100%)` entry
- `src/components/Toast/index.module.css` — `translateY(100%)` entry/exit, scale stacking
- `src/components/Radio/index.module.css` — `scale()` indicator
- `src/components/Checkbox/index.module.css` — `scale()` indicator
- `src/components/Tabs/index.module.css` — indicator slides via `left`
- `src/components/Accordion/index.module.css` — `height` expand, chevron `rotate`
- `src/components/SegmentedButton/index.module.css` — indicator slides via `transform`
- `src/components/_shared/popupPanel.module.css` — `scale(0.97)` entry
- `src/styles/app.module.css` — `successFlash` keyframe

Components with only color/opacity/border transitions (Button, Toggle, Input, Switch, etc.) do NOT need reduced-motion handling — those are safe and aid comprehension.

## Target

Add a global reduced-motion stylesheet that strips transform-based motion while preserving opacity and color transitions. Reduced motion means **gentler, not zero** — keep opacity fades and color changes that aid comprehension.

```css
/* src/styles/reduced-motion.css — new file */
@media (prefers-reduced-motion: reduce) {
  /*
   * Strip transform-based motion globally.
   * Opacity and color transitions are preserved — they aid comprehension
   * without causing vestibular discomfort.
   */

  /* Popups: keep opacity fade, drop scale */
  .Popup[data-starting-style],
  .Popup[data-ending-style] {
    transform: none !important;
  }

  /* Toast: keep opacity fade, drop translateY */
  .Root[data-starting-style],
  .Root[data-ending-style] {
    transform: none !important;
  }

  /* Drawer: instant open/close */
  .Popup {
    transition-duration: 0.01ms !important;
  }

  /* Accordion: instant expand */
  .Body {
    transition-duration: 0.01ms !important;
  }

  /* Indicators: instant, no scale */
  .Indicator {
    transition-duration: 0.01ms !important;
  }

  /* Success flash: keep color, shorten */
  .SuccessRow td {
    animation-duration: 0.2s !important;
  }
}
```

However, because CSS Modules scope class names, a global stylesheet targeting `.Popup` won't match the hashed names. The correct approach for this codebase is to add `@media (prefers-reduced-motion: reduce)` blocks **inside each component's module CSS**, next to the existing transition rules.

## Repo conventions to follow

- Each component owns its styles in `index.module.css` — follow that pattern.
- The codebase already gates hover with `@media (hover: hover) and (pointer: fine)` in 17 files — the reduced-motion blocks should follow the same inline-in-component pattern.
- Use nested `@media` inside selectors (the codebase uses CSS nesting throughout).

## Steps

1. **`src/components/Tooltip/index.module.css`** — In `.Popup`, after the existing `&[data-starting-style]` block, add:
   ```css
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

2. **`src/components/Popover/index.module.css`** — Same change in `.Popup`.

3. **`src/components/_shared/popupPanel.module.css`** — Same change in the popup element.

4. **`src/components/Dialog/index.module.css`** — In `.Popup`, add:
   ```css
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

5. **`src/components/Drawer/index.module.css`** — In `.Popup`, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     & {
       transition-duration: 0.01ms !important;
     }
   }
   ```
   (Drawer translates — no opacity to preserve, so just make it instant.)

6. **`src/components/Toast/index.module.css`** — In `.Root`, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     & {
       transition-duration: 0.01ms !important;
     }
     &[data-starting-style],
     &[data-ending-style] {
       transform: translateY(0) !important;
     }
   }
   ```

7. **`src/components/Tabs/index.module.css`** — In `.Indicator`, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     & {
       transition-duration: 0.01ms !important;
     }
   }
   ```

8. **`src/components/SegmentedButton/index.module.css`** — In `.Indicator`, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     & {
       transition-duration: 0.01ms !important;
     }
   }
   ```

9. **`src/components/Accordion/index.module.css`** — In the collapsible body and chevron icon, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     & {
       transition-duration: 0.01ms !important;
     }
   }
   ```

10. **`src/components/Radio/index.module.css`** — In `.Indicator`, add:
    ```css
    @media (prefers-reduced-motion: reduce) {
      & {
        transition-duration: 0.01ms !important;
      }
    }
    ```

11. **`src/components/Checkbox/index.module.css`** — Same as Radio.

12. **`src/styles/app.module.css`** — After `.SuccessRow td`, add:
    ```css
    @media (prefers-reduced-motion: reduce) {
      .SuccessRow td {
        animation-duration: 0.2s !important;
      }
    }
    ```

## Boundaries

- Do NOT remove any existing animations — only add reduced-motion overrides.
- Do NOT touch components that only animate color/opacity/border (Button, Toggle, Input, Switch, FilterChip, ScrollArea, etc.) — those are safe.
- Do NOT add new dependencies.
- If a file's structure doesn't match the excerpts (drift), STOP and report for that file; continue with others.

## Verification

- **Mechanical**: `npm run build` completes with no errors.
- **Feel check**: run the app. In Chrome DevTools → Rendering → check "Emulate CSS media feature prefers-reduced-motion: reduce":
  - Open a tooltip — it should fade in (opacity) but not scale.
  - Open a popover — same: fade only, no scale.
  - Open the drawer — it should appear instantly, no slide.
  - Trigger a toast — it should appear instantly, no slide-up.
  - Click a radio/checkbox — indicator appears instantly.
  - Switch tabs — indicator jumps instantly, no slide.
  - Expand an accordion — content appears instantly.
  - Complete a pending row — success flash is very brief (0.2s).
  - Uncheck the DevTools override — all animations should be back to normal.
- **Done when**: every transform-based animation in the list above is reduced or eliminated under `prefers-reduced-motion: reduce`, while opacity/color feedback is preserved.
