DeadlineItem is one row in the vencimientos list: date block, matter, status.

**Consumer provides:** `day`, `month` (abbr.), `daysLeft` (negative = overdue), `title`, `meta` (cliente · órgano · nº procedimiento), `href`.

**Rules:** sort ascending by date with overdue first; show the absolute date *and* relative status; the screen-reader text reads the full sentence (“Vence mañana”). Max 8 rows on the dashboard, then “Ver calendario”. Empty → “Sin vencimientos en los próximos 30 días” with a link to add one.

**Replaces:** `dashboard/DeadlineList.tsx` (12px text, `text-red-400 bg-red-400/10`, same red for “vencido” and “≤3 días”).
