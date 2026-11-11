# Implementation plan (repo)

Target: `andreslevano/avocatapp_legaltech_v3`, Next.js 14 App Router + Tailwind 3. Files referenced as `code/…` are in this system's Files and in the *Token files* section.

## 1. Token files — exact edits

1. **Replace `tailwind.config.js`** with `code/tailwind.config.js`.
   - Colours are role names backed by CSS variables (`bg-surface`, `text-text-muted`, `border-border-strong`, `bg-status-urgente-bg`…), plus primitives for charts.
   - **v3 names stay as deprecated aliases** re-pointed to v4 values (`avocat-gold` → `gold-500`, `ds-card` → `neutral-900`, `app`/`card`/`text-primary`…), so nothing breaks on day 1.
   - Tailwind default palettes still compile until `AVOCAT_STRICT_COLORS=1` is set (step 6), so the migration never silently drops styles.
   - Font sizes, z-index and spacing *extend* Tailwind (so `text-sm`, `z-50`, `w-64` keep compiling while you migrate). Radius and shadow are *replaced* but every key in use is kept and mapped onto v4: `rounded` stays 4px, `rounded-2xl` → 16px, `shadow`/`shadow-card` → `shadow-sm`, `shadow-xl`/`2xl` → `shadow-lg`.
   - Compiled and verified with Tailwind 3.4.17.
2. **Replace `src/styles/globals.css`** with `code/globals.css`: primitives, both themes under `:root, [data-theme="light"]` and `[data-theme="dark"]`, global `:focus-visible`, `::placeholder`, reduced motion, `.legal-doc` + print, and the legacy `.btn-*`/`.card`/`.input-field` re-pointed to roles. Keep the Zapier override only if the chatbot stays.
3. **Replace `src/lib/tokens.ts`** with `code/tokens.ts`: `primitives`, `themes.light|dark` (roles, status, chart), `type`, `space`, `radius`, `zIndex`, `motion`, `chartTheme(theme)`, `deadlineStatus(days)`. Type-checks under `tsc --strict`.
4. **`src/app/layout.tsx`:** add EB Garamond via `next/font/google` (`variable: '--font-document'`, weights 400/600, italic); set `<html lang="es" data-theme="light">`; wrap Ads/Clarity `<Script>`s in a consent check (default denied).
5. **`layout/AppShellClient.tsx`:** add `data-theme="dark"` on the shell root; replace `bg-[#161410]` with `bg-bg`; replace the auth spinner with a shell skeleton.
6. **`src/app/icon.svg`:** gold mark on ink (from `assets/Logos`).

### Find / replace map

Apply in order; regex-safe. Run the guard after each batch.

| Find | Replace | Count (src/) |
|---|---|---|
| `bg-[#161410]`, `bg-ds-bg` | `bg-bg` (inside dark shell) | 22 + |
| `bg-[#1e1c16]`, `bg-ds-card`, `bg-card` (in dark pages) | `bg-surface` | 39 + |
| `bg-[#252218]`, `bg-ds-card2`, `hover:bg-[#252218]` | `bg-surface-raised` / `hover:bg-surface-muted` | 27 |
| `border-[#2e2b20]`, `border-ds-border`, `divide-[#2e2b20]` | `border-border`, `divide-border` | 88 |
| `text-[#c8c0ac]`, `text-ds-text` | `text-text` | 61 |
| `text-[#e8d4a0]`, `text-ds-head` | `text-text-heading` | 30 |
| `text-[#6b6050]`, `text-[#9a9a9a]`, `text-avocat-gray9`, `text-[#6b7280]` | `text-text-muted` | 89 + 8 + 6 |
| `placeholder-[#3a3630]`, `placeholder:text-avocat-gray9` | *(delete — global `::placeholder`)* | 18 |
| `text-avocat-gray5`, `text-text-secondary`, `text-[#5f5f5f]` | `text-text-muted` | — |
| `text-text-primary`, `text-avocat-black`, `text-[#1e1e1e]` | `text-text` (`text-text-heading` on headings) | 225 + |
| `bg-app`, `bg-avocat-cream` | `bg-bg` | 41 + |
| `bg-white`, `bg-card` (light pages) | `bg-surface` | — |
| `bg-surface-muted` | *(now defined — keep)* | 259 |
| `bg-avocat-muted` | `bg-surface-muted` | — |
| `border-avocat-border` | `border-border` (cards) / `border-border-strong` (inputs) | — |
| `text-avocat-gold`, `text-[#B8882A]` (as text) | `text-accent-text` | — |
| `bg-avocat-gold text-white`, `bg-[#B8882A] text-white` | `bg-accent text-text-on-accent` | — |
| `hover:bg-[#a07824]`, `active:bg-[#8c6920]` | `hover:bg-accent-hover` | 7 + |
| `bg-avocat-gold-bg`, `bg-avocat-gold/10`, `bg-avocat-gold/20` | `bg-accent-subtle` | — |
| `border-avocat-gold-l`, `border-avocat-gold/30` | `border-accent-border` | — |
| `focus:ring-avocat-gold`, `focus:outline-none focus:ring-2 …` | *(delete — global `:focus-visible`)* | 87 / 50 |
| `text-red-{400…800}`, `bg-red-{50…100}`, `bg-red-400/10` (deadlines, status) | `StatusTag status="urgente|vencido"` or `text-danger-text`, `bg-danger-subtle` | 178 (red) |
| `text-green-*`, `text-emerald-*`, `bg-green-*`, `#10b981`, `#059669`, `#28a745` | `text-success-text`, `bg-success-subtle`, `StatusTag status="a-tiempo|pagado"` | 84 + 24 |
| `text-yellow-*`, `text-amber-*`, `text-orange-*`, `bg-amber-400/10` | `text-warning-text`, `bg-warning-subtle`, `status="proximo"` | 33 + 19 + 37 |
| `text-blue-*`, `bg-blue-*`, `#4a90e2`, `#3b82f6`, `#357abd`, `#2c3e50` | `text-info-text`, `bg-info-subtle`, `status="en-revision"`; links → `text-accent-text` | 81 |
| `text-gray-*`, `bg-gray-*`, `#f2f2f2`, `#f8f9fa`, `#f9fafb`, `#e5e7eb`, `#e9ecef` | `text-text-muted`, `bg-surface-muted`, `border-border` | 27 |
| `purple-*`, `indigo-*`, `#7c3aed`, `#4338ca`, `#be185d` | `chart-3…5` in charts; otherwise `accent` roles | 16 |
| `text-[10px]`, `text-[11px]` (sentences) | `text-caption` (12) — `text-label` only for uppercase eyebrows | 27 + 51 |
| `text-[12px]`, `text-xs` | `text-caption` | 61 + 165 |
| `text-[13px]`, `text-small` | `text-small` (meta) / `text-body-sm` (reading) | 39 + 86 |
| `text-sm`, `text-[14px]` | `text-body-sm` | 470 + 5 |
| `text-base`, `text-[16px]`, `text-body` | `text-body` | 46 + 4 + 53 |
| `text-lg`, `text-[17px]`, `text-[18px]` | `text-body-lg` | 106 + 3 |
| `text-xl`, `text-[20px]`, `text-[22px]` | `text-h3` | 42 + 5 + 3 |
| `text-2xl`, `text-[26px]`, `text-[28px]` | `text-h2` | 93 + 1 + 2 |
| `text-3xl`, `text-4xl`, `text-[32px]`, `text-[40px]` | `text-h1` | 16 + 8 + 3 + 1 |
| `text-5xl`, `text-6xl` | `text-display` | 3 |
| `rounded` (4px), `rounded-sm` | `rounded-xs` | 83 + 2 |
| `rounded-2xl` | `rounded-xl` | 12 |
| `shadow`, `shadow-card` | `shadow-sm` | 37 + 10 |
| `shadow-xl`, `shadow-2xl`, `shadow-elevated` (modals) | `shadow-lg` | 11 |
| `font-family: 'Times New Roman'`, `Arial` in HTML templates | `.legal-doc` class | 4 |
| pdfkit `'Helvetica'`, `'Helvetica-Bold'` | `doc.registerFont('Body', EBGaramond-Regular.ttf)` / `'Heading'` | ~180 |
| emoji in JSX | `<Icon name=…/>` per the map on the Icon card | 320 |

## 2. Consolidation — keep / delete

| Keep (v4 home) | Delete / merge | Notes |
|---|---|---|
| `layout/Navbar.tsx` → **Navbar** | `components/Header.tsx`, `UserTypeSelector.tsx` (header part), `ProductsDropdown.tsx` → **ProductsMenu** | Move `contacto`, `privacidad`, `terminos`, `cookies`, `gdpr`, `acerca-de`, `productos/*` under `src/app/(public)/` so they get the shared layout. |
| `layout/Footer.tsx` → **Footer** | `components/Footer.tsx` | One footer, one set of social links. |
| `landing/HeroSection.tsx`, `PersonaTabs.tsx`, `PricingSection.tsx`, `ValueProps.tsx` | `components/Hero.tsx`, `components/Pricing.tsx`, `components/Features.tsx` | Pricing reads `PLANS`. |
| `auth/*` | `PlanCards` merges into **PlanCard** `selectable` | One `PLAN_DASHBOARDS` (in `lib/plans.ts`). |
| `layout/AppShellClient.tsx`, `Rail.tsx`, `Sidebar.tsx`, `AppHeader.tsx`, `UserProfilePanel.tsx` | `DashboardShell.tsx`, `DashboardLayout.tsx`, `DashboardNavigation.tsx`, `components/Sidebar.tsx`, `UserMenu.tsx`, `LawyerToolbar.tsx` | `/profile`, `/subscription` move to `(app)/settings/*`. |
| `dashboard/KPICard.tsx`, `CasesChart.tsx`, `StatusDonut.tsx`, `DeadlineList.tsx`, `ClientTable.tsx` | `IndicatorCards.tsx`, `CaseStatistics.tsx`, `CustomerStatistics.tsx`, `ClientAnalytics.tsx` | Charts via `chartTheme()`. |
| `agent/*` | `ZapierChatbot.tsx` (or theme it) | Markdown rendering + CitationBlock. |
| `ui/Button.tsx`, `ui/Card.tsx`, `ui/Tag.tsx` → v4 APIs | `.btn-*`, `.card`, `.input-field` (after migration) | Add `ui/Field`, `Input`, `Select`, `Combobox`, `Checkbox`, `Switch`, `Modal`, `Drawer`, `Toast`, `Alert`, `Tabs`, `Stepper`, `StatusTag`, `Icon`. |
| `ReclamacionProcessSimple.tsx` (logic) | `ReclamacionProcess.tsx` | Split into a generic `DocumentWizard` + per-procedure config (reclamación, tutela); `TutelaProcessSimple.tsx` becomes config. |
| — | `SpainMap.tsx`, `WinProbabilityIndicator.tsx` | Audit: a “probabilidad de éxito” indicator in a legal product needs methodology + disclaimer, or removal. |

### Retiring `/dashboard/*` in favour of `(app)/*`

| Legacy route | New route |
|---|---|
| `/dashboard` (Abogados KPIs) | `/(app)/panel` |
| `/dashboard/casos`, `casos-urgentes`, `casos-a-tiempo`, `casos-vencidos` | `/(app)/cases?estado=urgente|a-tiempo|vencido` |
| `/dashboard/crear-caso` | `/(app)/cases/new` |
| `/dashboard/directorio-clientes` | `/(app)/clients` |
| `/dashboard/repositorio` | `/(app)/documents` |
| `/dashboard/generar-escritos`, `autoservicio/generacion-escritos` | `/(app)/tools/generacion` |
| `/dashboard/reclamacion-cantidades`, `autoservicio/reclamacion-cantidades` | `/(app)/escritos/reclamacion-cantidad` (DocumentWizard) |
| `/dashboard/accion-tutela`, `autoservicio/accion-tutela`, `accion-tutela/history` | `/(app)/escritos/accion-tutela` |
| `/dashboard/analisis-caso`, `autoservicio/extraccion-datos` | `/(app)/tools/analisis`, `/(app)/tools/extraccion-datos` |
| `/dashboard/autoservicio/revision-email` | `/(app)/tools/revision-email` |
| `/dashboard/auditoria-legal` | `/(app)/tools/auditoria` |
| `/dashboard/estudiantes` (1,867 lines) | `/(app)/estudio/*` (Tutor, Material) |
| `/dashboard/administrador` | `/(app)/admin` (role-gated) |
| `/profile`, `/subscription` | `/(app)/settings/perfil`, `/(app)/settings/suscripcion` |
| `/dev/stripe-reclamacion-test` | delete from production builds |

Add `redirects()` in `next.config.js` for every legacy path (301), update `PLAN_DASHBOARDS`, then delete `src/app/dashboard/`.

## 3. Migration order

**Quick wins (< 1 day each, highest impact / lowest risk)**
1. Token files + aliases (step 1 above). Instantly defines `surface-muted`, adds focus rings, placeholder contrast and reduced motion. Visual diff on 10 key pages.
2. `ui/Button` v4: BtnGold → `accent` with ink text; BtnDark → `primary`. Fixes every gold CTA.
3. AIDisclaimer on document previews, wizard download step and agent input.
4. Footer legal identification + `/aviso-legal`; one Navbar/Footer for legal pages (move under `(public)`).
5. CookieBanner + consent-gated Ads/Clarity.
6. `lib/plans.ts` (`PLANS`) consumed by PricingSection, product pages, PlanCards, Stripe ids; remove contradictory stats and English badges.
7. CI guard with baseline (below).
8. Logo: replace `Logo.tsx` sources with single-ink marks; delete `avocat-logo.svg`, `avocat-logo-full.svg`, `public/logos/*` stand-ins; favicon.
9. Signup: accents, Combobox, separate consent.

**Medium (1–3 days each)**
10. Agent: Markdown rendering, AgentMessage v4, ToolCallBadge, CitationBlock (with a CENDOJ/BOE verification step server-side), Stop, error states.
11. Deadline model: `deadlineStatus()`, StatusTag, DeadlineList v4; casos-* → filters.
12. Raw-hex sweep of `src/app/(app)` (208 literals) with the find/replace map.
13. Lucide + emoji removal (320).
14. Wizard re-order: review before payment; AIJobProgress; FileDropzone with OCR progress.
15. PDF/DOCX typography: embed EB Garamond in `src/lib/pdf/*`.

**Larger refactors (> 3 days)**
16. Move `/dashboard/*` pages into `(app)` with redirects; delete legacy shell & components.
17. Generic `DocumentWizard` replacing `ReclamacionProcess*` + `TutelaProcessSimple`.
18. Students area rebuild (`dashboard/estudiantes`, 1,867 lines).
19. i18n externalisation; es-419 pack.
20. Flip `AVOCAT_STRICT_COLORS=1`; delete v3 aliases and legacy classes.

## 4. Lint / CI guard

`code/check-design-tokens.mjs` → `scripts/check-design-tokens.mjs`. Rules: raw hex, arbitrary colour classes, Tailwind default palettes, arbitrary font sizes, hard-coded fonts, v3 aliases. Allowed files: `src/lib/tokens.ts`, `src/styles/globals.css`.

Run against `c5d8521`: **2,145 violations in 76 files** (default palette 504 · raw hex 489 · v3 alias 395 · arbitrary colour 360 · arbitrary size 210 · hard-coded font 187).

It ratchets: commit a baseline, fail only on new violations, lower the baseline as files migrate.

```json
// package.json
"scripts": {
  "lint:tokens": "node scripts/check-design-tokens.mjs --baseline .ds-baseline.json",
  "lint:tokens:baseline": "node scripts/check-design-tokens.mjs --baseline .ds-baseline.json --update-baseline"
}
```

```yaml
# .github/workflows/ci.yml (job step)
- run: npm run lint:tokens
- run: AVOCAT_STRICT_COLORS=1 npx tailwindcss -i src/styles/globals.css -o /tmp/out.css   # from step 20
```

Optional ESLint layer: `eslint-plugin-tailwindcss` with `no-arbitrary-value` + `no-custom-classname` (whitelist the role names), and `no-restricted-syntax` on JSX text matching emoji ranges.

## 5. `CLAUDE.md` — replace the “DESIGN SYSTEM v3 — TOKENS EXACTOS” section

Use `code/CLAUDE-design-system-v4.md` verbatim (shown in *Token files*). It tells AI-assisted work to use roles not hex, which theme applies where, which component to reach for, the copy rules, and to run `npm run lint:tokens` before committing.
