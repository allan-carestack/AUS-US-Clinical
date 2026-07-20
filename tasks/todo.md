# Code button → search morph

Status legend: [ ] pending · [~] in progress · [x] done

- [x] Keep SelectRow always mounted; collapse Care Panel / Note / Info when code search open
- [x] Add CodeMorph wrapper: button expands into CodeSearch input with reverse on close
- [x] CSS grid/flex + opacity morph (~220ms) + reduced-motion instant swap
- [x] Browser-check open morph, list enter, Escape/outside close reverse

## Review

**Changed**
- `CarePanel/index.tsx` — SelectRow always mounted; `codeSearchMode` (`closed`/`open`/`closing`); CodeMorph crossfades +Code ↔ CodeSearch; siblings collapse while open; reverse morph waits 220ms before unmount
- `CarePanel/index.module.css` — 0fr↔1fr + opacity morph for Care Panel / Note / Info; CodeMorph expand; reduced-motion disables transitions

**Verified**
- Open: morph width 62→467px; Care/Note/Info collapse; search field + listbox appear
- Close: reverse width morph; siblings restore; search unmounts after morph
