# DS v4 — progress

Branch `ds-v4` (from `main` @ 7eca9518). Not pushed.
Checks after every phase: `npm run build` (note: next.config has `ignoreBuildErrors`, so `npx tsc --noEmit` is also run — 23 pre-existing errors at start), `npm run lint:tokens`, `npm run lint:tokens:baseline`, `tests/unit` (Playwright node).

lint:tokens at start (no baseline): **5,806 violations in 118 files** (5,810 before the token files were swapped).

| Phase | Title | Status | Commit | lint:tokens after |
|---|---|---|---|---|
| 0 | Foundations | done | 6ea8c23b | 5,806 |
| 1 | Buttons & focus | done | 4b0dfb9d | 5,784 |
| 2 | AI disclaimer | done | 15efbd6e | 5,781 |
| 3 | Public chrome, legal id, consent | done | a12925cf | 5,756 |
| 4 | Single pricing source | done | 89c42c7f | 5,677 |
| 5 | Logo & icons | done | 0f7828fe | 5,633 |
| fix | Opacity modifiers on var colours | done | 929512df | — |
| 6 | Dark app: raw hex sweep | done | (this commit) | 2,770 |

## Phase 0 — Foundations
- CLAUDE.md: "DESIGN SYSTEM v3" section replaced with `CLAUDE-section.md`.
- `tailwind.config.js`, `src/styles/globals.css`, `src/lib/tokens.ts` replaced with v4. No file imported the old `@/lib/tokens` exports, so nothing to remap.
- globals.css: Zapier override re-appended (now `var(--accent)`); the `body.app-surface .btn-Btn*` dark-button overrides kept (re-pointed to primitives) until Phase 1 — TODO(ds-v4) to remove.
- `src/app/layout.tsx`: EB Garamond (`--font-document`), `data-theme="light"` on `<html>`.
- `AppShellClient.tsx`: `data-theme="dark"` on shell + loading div, `bg-bg`. Also sets `data-theme="dark"` on `<body>` while the shell is mounted, so portaled modals inside the app resolve dark roles (they render outside the shell div).
- `public/brand/avocat-mark-{cream,ink,gold}.png`.
- `lint:tokens` scripts + `.ds-baseline.json`; `lucide-react@1.72.0` (exact).
- `README-INSTALL.md` from the zip moved into `design-system/v4/` (it isn't part of the app).
- Build: pass. tsc: 23 (unchanged).
- Visually risky: h3/h4 switch from Cormorant to DM Sans globally; `rounded-2xl` 24→16px; `shadow-xl/2xl` → `shadow-lg`; body text colour now `var(--text)`; `bg-card`/`bg-app` follow the theme (dark inside the app).

## Phase 1 — Buttons & focus
- `ui/Button.tsx` v4: variants primary/accent/secondary/ghost/destructive, sizes sm/md/lg, `icon`/`iconRight` (Lucide), `loading`+`loadingText`, `block`, `href` (renders `<a>`). Legacy `Btn*` names still accepted (dev `console.warn`); `fullWidth` kept as a deprecated alias of `block`. Exported `buttonClasses()` for `<Link>`s styled as buttons. Native `type` default kept (forms that rely on submit keep working).
- All `variant="Btn*"` call sites (185) renamed to v4 variants. Accent = gold + ink text (was white on gold).
- `.btn-primary/.btn-secondary` usages in TSX (~45) → `<Button>` / `buttonClasses()`; the CSS classes remain in globals.css for now (deleted in Phase 10).
- Removed the `body.app-surface .btn-Btn*` dark overrides: v4 variants are role-based and correct in both themes.
- New `ui/IconButton.tsx` (required `label` → aria-label + title, `pressed`) and `ui/TextLink.tsx`.
- Build pass · tsc 23 · unit 217 pass.

## Phase 2 — AI disclaimer
- `ui/AIDisclaimer.tsx` (block | inline), fixed copy exported as constants.
- Block placed: `(app)/tools/generacion` (above the result), `(app)/tools/nda` (AI mode only — the MOBIFORWORK template is lawyer-validated text), `ReclamacionProcess.tsx` step 3, `TutelaProcessSimple.tsx` step 3, `ReclamacionProcessSimple.tsx` step 4 (confirmation/download), `productos/autoservicio` under "Cómo funciona".
- Inline: under the agent composer (`agent/AgentInput.tsx`), replacing "Avocat puede cometer errores".
- `productos/autoservicio`: "listo para presentar (ante el juzgado)" → "listo para revisar y presentar" (2 places).
- Skipped: `dashboard/generar-escritos` is only a redirect to `/tools/generacion`. Not added to `tools/contrato-servicios` (deterministic lawyer template, not AI output).

## Phase 3 — Public chrome, legal identification, consent
- Moved `acerca-de, contacto, privacidad, terminos, cookies, gdpr, productos` under `src/app/(public)/` (URLs unchanged — route group). Removed their own Navbar/Footer sub-layouts (acerca-de, productos) and the legacy `<Header/>`/`<Footer/>`.
- Deleted (unreferenced after the move): `components/Header.tsx`, `components/Footer.tsx`, `components/ProductsDropdown.tsx` (only used by Header), `components/UserTypeSelector.tsx` (no imports).
- Navbar v4: Abogados · Particulares · Estudiantes · Precios (`/#precios`) · Nosotros | Iniciar sesión · "Probar 14 días gratis" (`/signup?plan=abogados`), `aria-current`, dark band via `data-theme="dark"`, mobile menu button (aria-expanded, Esc closes, focus returns).
- Footer v4: one social set (`SOCIAL_LINKS`), "Configurar cookies", legal line from `src/lib/company.ts` (placeholders → TODO(ds-v4)), "Aviso legal" link.
- New `/aviso-legal` page.
- `CookieBanner` + `lib/consent.ts`: first-party cookie `avocat_consent` (180 days), Rechazar/Aceptar todas equal weight, Configurar with Analíticas/Publicidad off by default. Root layout sets Google Consent Mode v2 defaults (all denied) `beforeInteractive`; `ConsentScripts` loads gtag (AW-16479671897) only with Publicidad and Clarity only with Analíticas. `window.gtag` exists from the start so existing `trackXxx()` calls queue safely.
- lint:tokens shows "new" only for renamed files (path change), baseline rewritten.

## Phase 4 — Single pricing source
- `src/lib/plans.ts`: `PLANS` (abogados 75 €/mes featured, particulares 10 €/escrito, estudiantes 3 €/escrito), `SALES_CONTACT`, single `PLAN_DASHBOARDS` (keyed by the stored Firestore plan names, which are unchanged), `planFromParam()` (accepts v4 ids + legacy `?plan=` values), `formatEuro()`/`priceLabel()` (es-ES: "75 €").
- Stripe: Abogados reuses `SUBSCRIPTION_PRICE_IDS.Abogados`; no per-document price ids exist for Particulares/Estudiantes → `null` + TODO(ds-v4).
- **Particulares 50 €/mes bundle**: removed from public pages (home pricing, product page tag). Its Stripe path is untouched — signup still opens the 50 €/mes subscription checkout for Particulares, so `PlanCards` (signup/onboarding) shows **50 €/mes** for that card to avoid displaying a price different from the one charged. TODO(ds-v4) business decision (see REPORT).
- Consumers: `landing/PricingSection.tsx` (3 cards + "Hablar con ventas" link; also fixes a pre-existing tsc error → tsc 22), `auth/PlanCards.tsx` (radiogroup), the three `productos/*` pages (tags from PLANS; nested `<Link><Button>` → `<Button href>`; hero gets `data-theme="dark"`), `SignupForm`, `OnboardingStep`, `lib/auth.getDashboardRoute` (all use the one `PLAN_DASHBOARDS`). Signup's post-signup redirect for Estudiantes/Particulares is now `/agent` (as onboarding and `getDashboardRoute` already did) instead of the legacy `/dashboard/*` pages.
- `ProductsDropdown.tsx` was deleted in Phase 3 (only used by the deleted Header).
- Removed unsourced claims: "1,200 casos", "85 %", "80 % tiempo ahorrado", "100+/50+/10+" stat grids, "GDPR Compliant", "99.9% Uptime", "Cifrado bancario", "Soporte 24/7", "Sin tarjeta de crédito" (TODO: restore only if the trial truly needs no card). TrustBand now lists 3 verifiable product facts.
- Deleted unreferenced legacy `components/Hero.tsx`, `Pricing.tsx`, `Features.tsx`.
- Glossary applied in touched public files: Dashboard → Panel, Template → Plantilla, Modo Agente → Agente IA, CTAs per persona, México/Perú labels (stored values unchanged).

## Phase 5 — Logo & icons
- `brand/Logo.tsx` v4: `variant` mark | wordmark | lockup, `tone` ink | cream | gold → `/brand/avocat-mark-{tone}.png`, wordmark Cormorant 600 +0.14em; no CSS filters. Usages updated (Navbar, Footer, Rail, Hero). TODO(ds-v4): vector SVG of the monogram.
- `src/app/icon.svg`: 32px neutral-900 rounded square with the gold mark (PNG embedded as data URI).
- Deleted: `public/images/avocat-logo.svg`, `avocat-logo-full.svg`, `avocat-logo 2.svg`, `avocat logo white v1.png`, `public/logos/*`. Kept `avocat-logo-white-v1.png` (still used by legacy `components/Sidebar.tsx`, removed in Phase 9).
- Emoji → Lucide in layout/ (Rail inline Heroicons → Lucide; Rail also moved to role tokens, `aria-current`, labels, "Dashboard" → "Panel"), landing/, auth/ + signup page, agent/ (attachments via new `ui/FileTypeIcon.tsx`, ToolCallBadge running/done icons, AgentMessage Heroicons → Lucide), `(app)` pages (tools tiles, cases, documents, signatures return, generacion, estudiantes, revision-email, nda, analisis) and components (documents, integrations, legal verdict icons, signatures, AnalisisExitoModal). Country flags in the profile panel → plain names (ISO codes in data).
- Deleted unreferenced `components/LanguageSelector.tsx`.
- Not converted here (rebuilt/deleted later): `TutelaProcessSimple`, `ReclamacionProcess*` (Phase 8), `dashboard/*`, `profile`, `DashboardNavigation`, `PurchaseHistory` (Phase 9). Emoji in `src/lib/*` are server log prefixes, not UI — left as is.
- tsc 20 (Rail `pathname` null fixes).

## Fix — opacity modifiers (929512df)
- Found after Phase 0: v4 colours are `var(--…)`, so Tailwind silently dropped every `/NN` opacity class on them (e.g. 227 × `border-avocat-gold/40`, `bg-avocat-gold/10` → no CSS; borders/backgrounds vanished). `tailwind.config.js` now wraps var colours so a modifier compiles to `color-mix(in srgb, var(--x) NN%, transparent)`; unmodified classes stay plain `var(--x)`.

## Phase 6 — Dark app: raw hex sweep
- Scope: `src/app/(app)/**`, `src/components/{layout,agent,dashboard}/**` (43 files). Mechanical pass with the PLAN.md find/replace map (hex → roles, v3 aliases → roles, red/green/amber/blue palettes → danger/success/warning/info roles and `status-*` borders, gold fills carry `text-text-on-accent`, `focus:outline-none`/`focus:ring-*` removed, arbitrary `text-[Npx]` → type scale with 12px floor, uppercase eyebrows → `text-label`, `placeholder-[…]` removed).
- New `ui/StatusTag.tsx` (8 legal statuses, icon + word + colour). `dashboard/DeadlineList.tsx` now uses `deadlineStatus()` + `StatusTag` and DeadlineItem copy ("Vence mañana", "Venció hace 2 días") — its private `deadlineColor/daysColor` copy of the rule is gone.
- Charts (`CasesChart`, `StatusDonut`) read `themes.dark` / `chartTheme('dark')` instead of hex.
- Scope violations: ~1,050 → 0. Total 5,633 → 2,770.
- Note: `bg-[#161410]/90` overlays became opaque `bg-bg`. One unit-test run failed once during the build and passed 3/3 on rerun (flaky timing, not related).
- Not subagent-delegated: the map is mechanical, so one script applied it consistently; reviewed the diff by sampling.
