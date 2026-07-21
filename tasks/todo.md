# Fix +code keyboard highlight padding

Status legend: [ ] pending · [~] in progress · [x] done

- [x] Add `width: 100%` and `min-width: 0` to `.ListItem` in `listItem.module.css`
- [x] Verify keyboard nav keeps inset highlight; long labels ellipsis

## Review

**Changed**
- `src/components/_shared/listItem.module.css` — constrain `.ListItem` with `width: 100%` and `min-width: 0` so column-flex rows shrink and ellipsis instead of overflowing the padded list

**Verified**
- Keyboard highlight on CarePanel +code list (filter `66`, ArrowDown): `leftGap`/`rightGap` = 4px (matches list padding), `min-width: 0px`, `scrollOverflow: 0`
