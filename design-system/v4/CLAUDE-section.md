## DESIGN SYSTEM v4 — Avocat (replaces “DESIGN SYSTEM v3 — TOKENS EXACTOS”)

Source of truth: Avocat Design System v4 (`tokens.json`) → `tailwind.config.js`, `src/styles/globals.css`, `src/lib/tokens.ts`. Never edit values in more than one place.

### Hard rules
- **No raw colours.** No hex, rgb or `bg-[#…]` in components; no Tailwind default palettes (`red-500`, `gray-600`…). Use role classes. `npm run lint:tokens` must pass.
- **Themes, not hard-coded dark.** Public routes render with `data-theme="light"`; the app shell sets `data-theme="dark"`. Components never pick colours per theme.
- **No emoji as icons.** Use `lucide-react` (`<Icon name="…" />`), 16/18/20/24px, `currentColor`.
- **No arbitrary sizes.** Use `text-display|h1|h2|h3|h4|body-lg|body|body-sm|small|caption|label|mono`, spacing steps, `rounded-xs|sm|md|lg|xl|full`, `shadow-sm|md|lg`, `z-*` names.
- **Never remove focus.** The global `:focus-visible` ring is required; don't add `outline-none` without a replacement.

### Roles (use these)
- Surfaces: `bg-bg`, `bg-surface`, `bg-surface-raised`, `bg-surface-muted`, `bg-surface-inverse`
- Text: `text-text`, `text-text-heading`, `text-text-muted`, `text-text-inverse`, `text-accent-text`, `text-text-on-accent`
- Borders: `border-border` (decorative), `border-border-strong` (inputs/controls), `border-accent-border`
- Accent: `bg-accent` + `text-text-on-accent` (ink, never white), `hover:bg-accent-hover`, `bg-accent-subtle`
- Primary action: `bg-action-primary text-on-action-primary hover:bg-action-primary-hover`
- Feedback: `text-{danger|success|warning|info}-text`, `bg-{…}-subtle`, `bg-danger text-on-danger`
- Legal status: `<StatusTag status="vencido|urgente|proximo|a-tiempo|borrador|en-revision|presentado|pagado" />`; compute deadlines with `deadlineStatus(days)` from `@/lib/tokens`
- Charts / canvas / PDF: `themes[theme]`, `chartTheme(theme)` from `@/lib/tokens`

### Type
- Cormorant Garamond (`font-display`) only for `display`, `h1`, `h2` (≥ 28px). DM Sans for UI and `h3`/`h4`. EB Garamond (`font-document`, `.legal-doc`) for generated documents, previews and PDFs. App reading text is `text-body-sm` (14px); minimum 12px (`text-caption`); `text-label` only for uppercase eyebrows.

### Components (prefer, in this order)
`ui/*` v4 (Button, IconButton, Field, Input, Select, Combobox, Checkbox, Switch, Card, StatusTag, Modal, Drawer, Toast, Alert, Tabs, Stepper, Icon) → `layout/*` (Navbar, Footer, AppShellClient, Rail, Sidebar, AppHeader, UserProfilePanel) → `agent/*` → `dashboard/*`. Do not import from `components/Header|Footer|Sidebar|Hero|Pricing|DashboardShell|DashboardLayout` — they are being deleted. New authenticated pages go in `src/app/(app)/`, never `src/app/dashboard/`.

### Copy
Spanish (es-ES), `tú`, sentence case. Panel (not Dashboard), Demostración (not Demo), Plantilla (not Template). Numbers `1.200`, `3.480,00 €`, `85 %`. One primary CTA per view. Prices only from `lib/plans.ts`. Every generated document and agent answer shows the AIDisclaimer (“Revisa antes de presentar…”); citations go through CitationBlock with verification state. No unsourced stats or trust badges.

### Before committing UI work
`npm run lint:tokens` · check both themes · keyboard-only pass · 375px pass.
