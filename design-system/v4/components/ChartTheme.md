ChartTheme is the Chart.js configuration for both themes: series `chart-1…6`, `chart-grid`, `chart-axis`, tooltip on `surface-inverse`.

**Consumer provides:** data; read colours with `chartTheme(theme)` from `src/lib/tokens.ts` (or `getComputedStyle` on the themed container) and re-create charts on theme change.

**Rules**
- Order series 1→6; ≤ 4 series per chart, otherwise group into “Otros” (`chart-6`).
- DM Sans 12px ticks; no gridlines on x; legend as HTML below the chart (keyboard and zoom friendly).
- Every canvas has `role="img"` + an `aria-label` summarising the data, and a “Ver como tabla” toggle for exact figures.
- Status charts (StatusDonut) use the `status-*-fg` colours, in the same order as the StatusTag legend.

**Replaces:** colour constants in `dashboard/CasesChart.tsx`, `dashboard/StatusDonut.tsx`, `CustomerStatistics.tsx` (`#4a90e2`, `#10b981`, …).
