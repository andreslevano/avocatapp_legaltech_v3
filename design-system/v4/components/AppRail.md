AppRail is the 52px primary navigation of the app shell (≥ 768px): logo, six sections, notifications and profile.

**Sections:** Panel · Agente IA · Casos · Documentos · Clientes · Herramientas. The section set depends on plan (Estudiantes: Tutor, Material, Documentos; Particulares: Mis escritos, Nuevo escrito, Documentos) but the component is the same.

**Rules:** each item is a link with `aria-label` + tooltip; current = `accent-subtle` fill, `accent-text` icon and a 2px gold marker (not colour alone). Arrow keys are not required (it's a list of links); Tab order top→bottom. Below 768px it's replaced by `BottomNav`.

**Replaces:** `layout/Rail.tsx` (Heroicons pasted inline, raw hex), `DashboardNavigation.tsx`, legacy `components/Sidebar.tsx` top nav.
