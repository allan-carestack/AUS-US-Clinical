# Lessons

## Claude / agent hygiene
- Never commit `node_modules/.vite` cache churn — restore to base branch or add a real `.gitignore` before staging.
- Boolean UI wiring: when a checkbox means "show X", columns must use `showX ? cols : []`, not the inverted form — verify default-on state shows the columns.
- Popover `.Popup` only needs `padding-top`; Header/Body already own the rest — do not expand to full `padding`.
