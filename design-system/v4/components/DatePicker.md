DatePicker selects one date — used for plazos and vencimientos.

**Consumer provides:** `month` `[year, monthIndex]`, `selected`, `deadlines` (days that already have vencimientos — shown as a dot), `today`, `footer`.

**Rules**
- Always pair with a typed input (`dd/mm/aaaa`, Spanish order); the calendar is an aid, not the only way in.
- Week starts Monday; day initials L M X J V S D with full names as `abbr`.
- Show legal context next to the field: “Plazo de 20 días hábiles · vence el 9 dic 2026”. Computing días hábiles requires a holiday calendar per country and region; until it exists, label results “orientativo”.
- Grid keyboard: arrows move by day/week, PageUp/PageDown by month, Enter selects, Esc closes.
