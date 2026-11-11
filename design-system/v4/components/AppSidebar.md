AppSidebar is the 220px secondary navigation for the current section: title, primary action, grouped links with counts.

**Rules:** counts use tabular figures; urgent counts use `status-urgente-fg` *and* a screen-reader noun. Persistent ≥ 1024px; 768–1023px it collapses into a toggle (`panel-left` IconButton in the app header); < 768px it opens as a Drawer. Legacy routes `casos-urgentes`, `casos-a-tiempo`, `casos-vencidos` become **filters** of one Casos list, linked from here.

**Replaces:** `layout/Sidebar.tsx`, `components/Sidebar.tsx` (439 lines, light theme), `DashboardShell.tsx`, `DashboardLayout.tsx`.
