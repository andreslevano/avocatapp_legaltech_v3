KPICard shows one metric with label, value and optional trend.

**Consumer provides:** `label` (≤ 3 words, uppercase via `label` style), `value` (pre-formatted, Spanish locale: `1.200`, `38 h`), `icon`, `trend` (%), `goodWhen` (`up` default · `down` — e.g. vencimientos), `trendLabel`, `loading`.

**Spec:** value in Cormorant 34/40 `text-heading` with tabular figures; label `label` style in `text-muted` (v3 used `#6b6050`, 2.77:1 on `#1e1c16` — fails). Trend uses `success-text`/`danger-text` **plus** an arrow and sign, so colour isn't the only cue.

**Don't** show vanity metrics without a period, or KPIs a new user can't have (show `EmptyState` until there's data).

**Replaces:** `dashboard/KPICard.tsx`, `IndicatorCards.tsx`, `CaseStatistics.tsx` tiles.
