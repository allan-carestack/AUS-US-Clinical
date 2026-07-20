# 009 — Add subtle press scale on duration chip pencil

- **Status**: DONE
- **Commit**: N/A (not a git repo)
- **Severity**: LOW
- **Category**: Physicality
- **Estimated scope**: 1 file (`PhaseDuration.module.css`), ~12 lines

## Problem

The pencil control that opens the phase duration editor has hover color feedback but no press feedback. Pressable controls in this design system should dip slightly on `:active` so the click feels physical.

```css
/* src/components/TreatmentPlanView/PhaseDuration.module.css:117-135 — current */
.EditButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--grey-60);
  cursor: pointer;
  border-radius: var(--radius-default);
  flex-shrink: 0;
}

.EditButton:hover {
  color: var(--grey-100);
}
```

Note: `PhaseDuration.tsx` calls `event.preventDefault()` on `onMouseDown` so focus can move to Hours. That must remain. Press scale is visual-only via CSS `:active` and does not require focus.

## Target

```css
/* PhaseDuration.module.css — target */
.EditButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--grey-60);
  cursor: pointer;
  border-radius: var(--radius-default);
  flex-shrink: 0;
  transition:
    color 100ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (hover: hover) and (pointer: fine) {
  .EditButton:hover {
    color: var(--grey-100);
  }

  .EditButton:active {
    transform: scale(0.97);
  }
}

.EditButton:focus-visible {
  outline: 2px solid var(--interactive-60);
  outline-offset: 2px;
}
```

Move the existing unguarded `.EditButton:hover` rule into the `@media (hover: hover) and (pointer: fine)` block so touch devices do not sticky-hover. Keep `:focus-visible` outside that media query.

Exact values from the audit playbook:

- Press scale: `0.97` (allowed band 0.95–0.98)
- Press transform duration: `160ms`
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (same chip family as plans 006–008)

## Repo conventions to follow

- Hover gating with `@media (hover: hover)` is already used on chips/buttons elsewhere (e.g. `FilterChip`, `Checkbox`).
- Color transitions at ~100ms match `Button` / `FilterChip` feedback speed.
- Do not add JS press handlers.

## Steps

1. In `PhaseDuration.module.css`, update `.EditButton` with the `transition` lines from Target.
2. Replace the bare `.EditButton:hover` rule with the `@media (hover: hover) and (pointer: fine)` block containing both `:hover` and `:active`.
3. Leave `.EditButton:focus-visible` as-is (still after the media block).
4. Do not edit `PhaseDuration.tsx`.

## Boundaries

- Do NOT remove `onMouseDown` preventDefault on the pencil in TSX.
- Do NOT scale the whole `.Chip` on press — only `.EditButton`.
- Do NOT use `scale(0.95)` or bounce springs.
- Do NOT change icon assets.

## Verification

- **Mechanical**: open Treatment Plan; pencil still opens the editor; Hours still receive focus after click.
- **Feel check**:
  - On a mouse/trackpad: press and hold the pencil — icon scales to ~97% then releases.
  - In DevTools Animations @ 10%: transform interpolates over 160ms with ease-out character.
  - Emulate a coarse pointer / remove hover: `:active` scale should not rely on sticky hover; opening still works.
  - With `prefers-reduced-motion: reduce`, optional: keep the 160ms scale (subtle) or set `transform` transition-duration to `0.01ms` only if you also touch the reduce block — default is **keep** the press scale (it is 160ms feedback, not a large travel animation).
- **Done when**: `.EditButton:active` includes `transform: scale(0.97)` inside a hover-capable media query, and pencil click behavior is unchanged.
