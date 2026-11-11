AppShell is the authenticated layout: Rail (52) + Sidebar (220) + content + optional agent panel (400, ≥ 1280px), in the dark theme.

**Consumer provides:** `current` section, `title`, header `actions`, `sidebar` (false to hide), `sidebarProps`, children.

**Rules**
- **One shell for every authenticated route.** Today `AppShellClient` wraps both `(app)/*` and `dashboard/*`, but legacy pages paint light `bg-app`/`bg-card`/`text-text-primary` panels inside the dark frame, and `/profile`, `/subscription` use the older `DashboardShell` + light `components/Sidebar.tsx`.
- Theme is set once with `data-theme="dark"` on the shell; pages never hard-code surface colours.
- Header 56px, sticky; page title in Cormorant 22/28; breadcrumbs on detail pages.
- Content max width 1200 for dashboards, 760 for agent conversation, 720 for document preview.
- Loading auth: full-shell skeleton (rail + sidebar + header) instead of the centred spinner.

**Replaces:** `layout/AppShellClient.tsx` (structure kept), `DashboardShell.tsx`, `DashboardLayout.tsx`.
