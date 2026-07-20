# 001 — Replace height animation with GPU-composited collapse

- **Status**: TODO
- **Commit**: N/A (not a git repo)
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file (`src/App.tsx`), ~5 lines

## Problem

The odontogram + care panel wrapper animates `height` between `0rem` and `30rem` when collapsing/expanding. `height` triggers layout on every frame for 260ms — the most expensive animation in the app, affecting a container with an SVG odontogram and a full care panel inside it.

```tsx
/* src/App.tsx:935-942 — current */
<div
  style={{
    flexShrink: 0,
    height: headerCollapsed ? '0rem' : '30rem',
    opacity: headerCollapsed ? 0 : 1,
    overflow: 'hidden',
    transition: 'height 260ms ease, opacity 200ms ease',
  }}
>
```

Additionally, the easing is `ease` — correct for hover/color but wrong for an enter/exit transition. `ease-out` front-loads the motion where the user watches.

## Target

Replace `height` animation with a CSS `grid` row collapse pattern. This keeps the element in flow (no `position: absolute` needed), supports `overflow: hidden` clipping, and the actual animated property is `grid-template-rows` which — when transitioning between `1fr` and `0fr` — is far cheaper than animating an explicit `height` value because the browser only needs to resolve the fraction, not re-layout the full subtree on every frame. Pair with `opacity` for a clean visual.

```tsx
/* target */
<div
  style={{
    flexShrink: 0,
    display: 'grid',
    gridTemplateRows: headerCollapsed ? '0fr' : '1fr',
    opacity: headerCollapsed ? 0 : 1,
    transition: 'grid-template-rows 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
  }}
>
  <div style={{ overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--spacing-24)', height: '30rem' }}>
```

The strong ease-out curve `cubic-bezier(0.23, 1, 0.32, 1)` replaces the bare `ease`.

## Repo conventions to follow

- Inline styles are used for this collapsible wrapper (it's the only instance) — no CSS module needed.
- Other enter/exit transitions in the codebase use `ease-out` (e.g. `src/components/Drawer/index.module.css:7`, `src/components/Dialog/index.module.css:7`).

## Steps

1. In `src/App.tsx`, find the `<div>` at approximately line 935 with the `height`/`opacity`/`transition` inline style.

2. Replace the inline style object:

   **From:**
   ```tsx
   style={{
     flexShrink: 0,
     height: headerCollapsed ? '0rem' : '30rem',
     opacity: headerCollapsed ? 0 : 1,
     overflow: 'hidden',
     transition: 'height 260ms ease, opacity 200ms ease',
   }}
   ```

   **To:**
   ```tsx
   style={{
     flexShrink: 0,
     display: 'grid',
     gridTemplateRows: headerCollapsed ? '0fr' : '1fr',
     opacity: headerCollapsed ? 0 : 1,
     transition: 'grid-template-rows 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
   }}
   ```

3. Wrap the immediate child `<div>` (the flex row with odontogram + care panel) in an `overflow: hidden` wrapper:

   **From:**
   ```tsx
   <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--spacing-24)', height: '30rem' }}>
   ```

   **To:**
   ```tsx
   <div style={{ overflow: 'hidden' }}>
     <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--spacing-24)', height: '30rem' }}>
   ```

   Close the new wrapper `</div>` after the existing inner `</div>`.

## Boundaries

- Do NOT touch any other animation in the file.
- Do NOT change the collapse/expand logic or `headerCollapsed` state.
- Do NOT add new dependencies.
- If the code at line ~935 doesn't match the excerpt above (drift), STOP and report.

## Verification

- **Mechanical**: `npm run build` should complete with no errors. No type errors expected (inline styles accept `gridTemplateRows`).
- **Feel check**: run the app, click the collapse chevron on the Tx Plan header:
  - The panel should collapse smoothly with no layout jank — content clips away, doesn't squash.
  - Expanding should feel snappy — the motion front-loads due to `ease-out`.
  - In DevTools Performance panel, record a collapse. Confirm no Layout events on every frame (there should be one at the start and one at the end, not 15+).
  - In DevTools, set animation playback to 25% and confirm the opacity and grid-row transitions stay in sync.
- **Done when**: collapse/expand is visually identical, no layout-per-frame in the Performance panel, and `ease` is replaced with the strong ease-out curve.
