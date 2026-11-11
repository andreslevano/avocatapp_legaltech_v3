# Avocat Design System v4: run report

Branch **`ds-v4`**, created from `main` @ 7eca9518. **Not pushed.** Run date: 11 Nov 2026. Detailed per-phase notes are in `PROGRESS.md`.

## Result

| Metric | Before | After |
|---|---|---|
| `npm run lint:tokens` violations | 5,806 in 118 files | **0** (baseline `{}`) |
| `npx tsc --noEmit` errors (build ignores TS) | 23 | 16 (all pre-existing, untouched files) |
| Unit tests (`tests/unit`) | 217 pass | 217 pass |
| `next build` / strict build (`AVOCAT_STRICT_COLORS=1`) | — | pass / pass |

## Phases

| Phase | Commit |
|---|---|
| 0 Foundations (tokens, Tailwind, globals, EB Garamond, themes, lucide, lint guard) | 6ea8c23b |
| 1 Buttons & focus (Button v4, IconButton, TextLink) | 4b0dfb9d |
| 2 AI disclaimer | 15efbd6e |
| 3 Public chrome, legal identification, cookie consent | a12925cf |
| 4 Single pricing source (`lib/plans.ts`) | 89c42c7f |
| 5 Logo & icons (Lucide) | 0f7828fe |
| fix: opacity modifiers on CSS-variable colours | 929512df |
| 6 Dark app raw-hex sweep, StatusTag, deadlineStatus | e06ab228 |
| 7 Agent (Markdown, citations, composer, errors) | a0c34d8b |
| 8 Document wizard (review before payment), EB Garamond PDFs | 14f1d743 |
| 9 Retire /dashboard (routes, 301s, legacy deletion) | 7d9f6c7e |
| 10 Lock it (strict colours, v3 aliases removed, baseline 0, CI) | 378307cb |

Phases 6–9 were done directly rather than through subagents. The find/replace map was applied by one script so it stays consistent, and each diff was reviewed by sampling, with visual checks via screenshots.

## Files deleted
- **Phase 3:** `components/Header.tsx`, `components/Footer.tsx`, `components/ProductsDropdown.tsx`, `components/UserTypeSelector.tsx`, and the sub-layouts `acerca-de/layout.tsx` and `productos/layout.tsx`.
- **Phase 4:** `components/Hero.tsx`, `components/Pricing.tsx`, `components/Features.tsx`.
- **Phase 5:**
  - `public/images/avocat-logo.svg`, `avocat-logo-full.svg`, `avocat-logo 2.svg`, `avocat logo white v1.png`;
  - `public/logos/avocat-{signature,stacked,symbol}.svg`;
  - `components/LanguageSelector.tsx`.
- **Phase 8:** `components/ReclamacionProcess.tsx`.
- **Phase 9:**
  - `src/app/dashboard/**` (19 files), `src/app/profile/layout.tsx`;
  - `components/DashboardShell.tsx`, `DashboardLayout.tsx`, `DashboardNavigation.tsx`, `Sidebar.tsx`, `UserMenu.tsx`, `LawyerToolbar.tsx`;
  - `IndicatorCards.tsx`, `CaseStatistics.tsx`, `CustomerStatistics.tsx`, `ClientAnalytics.tsx`;
  - `contexts/DashboardAuthContext.tsx`.

Every deletion was checked for references first.

## Redirects added (`next.config.js`, all 301; query strings preserved, verified with `next start`)
- `/dashboard` → `/panel`
- `/dashboard/casos` → `/cases`
- `/dashboard/casos-urgentes|casos-a-tiempo|casos-vencidos` → `/cases?estado=urgente|a-tiempo|vencido`
- `/dashboard/crear-caso` → `/cases/new`
- `/dashboard/directorio-clientes` → `/clients`
- `/dashboard/repositorio` → `/documents`
- `/dashboard/generar-escritos`, `/dashboard/autoservicio/generacion-escritos` → `/tools/generacion`
- `/dashboard/reclamacion-cantidades`, `/dashboard/autoservicio/reclamacion-cantidades` → `/escritos/reclamacion-cantidad`
- `/dashboard/accion-tutela`, `/dashboard/autoservicio/accion-tutela` → `/escritos/accion-tutela`
- `/dashboard/accion-tutela/history` → `/escritos/accion-tutela/historial`
- `/dashboard/analisis-caso`, `/dashboard/auditoria-legal` → `/tools/analisis`
- `/dashboard/autoservicio/extraccion-datos` → `/tools/extraccion-datos`
- `/dashboard/autoservicio/revision-email` → `/tools/revision-email`
- `/dashboard/estudiantes` → `/tools/estudiantes`
- `/dashboard/administrador` → `/admin`
- `/dashboard/:path*` → `/panel`
- `/profile` → `/settings/perfil`
- `/subscription` → `/settings/suscripcion`

## Decisions and TODOs that need a human

### Blocking before release
1. **Particulares pricing vs. what Stripe charges.**
   - Public pages now say **10 €/escrito**, as the RUN default specifies.
   - Signup still opens the legacy **50 €/mes** subscription checkout for Particulares; its Stripe path was left untouched.
   - So the signup plan card shows 50 €/mes, to never display a price different from the one charged.
   - Decide: retire the bundle and switch signup to pay-per-document, or keep it as a "Bono".
   - Where: `src/lib/plans.ts` (`PARTICULARES_LEGACY_BUNDLE`, `stripePriceId: null` for particulares/estudiantes), `src/components/auth/PlanCards.tsx`.
2. **Company legal data.** Fill `[RAZÓN SOCIAL] [NIF] [DOMICILIO] [REGISTRO MERCANTIL]` in `src/lib/company.ts`. It feeds the footer and `/aviso-legal`, whose text also needs counsel validation (`src/app/(public)/aviso-legal/page.tsx`).
3. **14-day trial.** Confirm the Abogados Stripe price really has a trial (`src/lib/plans.ts:36`). "Sin tarjeta de crédito" was removed everywhere because signup goes straight to checkout; restore it only if true (`src/components/landing/CtaSection.tsx`).

### Product / legal review
4. **Privacy note next to uploads.** "cifrados, solo los ves tú, no se usan para entrenar modelos" needs counsel confirmation (`src/components/wizard/FileDropzone.tsx:82`).
5. **Citation verification.** Sources always show "No localizada" until a CENDOJ/BOE server hook sets `verified` (`src/components/agent/CitationBlock.tsx:14`, `AgentMessage.tsx:29`).
6. **Answer feedback.** "útil / mejorable" needs an endpoint (`src/components/agent/AgentMessage.tsx:166`).
7. **Legal-document typography.** `src/lib/doc-html.ts` (Word/PDF/DocuSign exports, including the lawyer-validated MOBIFORWORK templates) keeps Times New Roman. It is allowlisted in `scripts/check-design-tokens.mjs`. Decide whether to move it to EB Garamond.
8. **Orphaned components.** `WinProbabilityIndicator.tsx` and `SpainMap.tsx` are kept but unreferenced. A "probabilidad de éxito" indicator needs a documented methodology and disclaimer, or removal.
9. **Zapier chatbot.** The AIDisclaimer can't be injected into the third-party popup (`src/components/ZapierChatbot.tsx:6`).
10. **Tutela field extraction.** "Aplicar datos extraídos" was removed because it filled the form with placeholder text. Real field extraction from the OCR text is still to build (`src/components/TutelaProcessSimple.tsx:271`).
11. **Generation progress.** Both wizards show AIJobProgress at a fixed step; drive it from generation status (`ReclamacionProcessSimple.tsx:715`, `TutelaProcessSimple.tsx:1007`).
12. **Tutela step-5 download.** "Descargar PDF/Word" exports the summary note, not the tutela itself. That behaviour is pre-existing (`TutelaProcessSimple.tsx:1033`).
13. **Tutela history.** The history page calls the API with `uid=demo_user`; pre-existing (`src/app/(app)/escritos/accion-tutela/historial/page.tsx:31`).
14. **Reclamación charge.** The amount charged is still hard-coded at 1000 cents; derive it from `PLANS` once Stripe uses a price id (`ReclamacionProcessSimple.tsx:372`).
15. **Logo vector.** Export the monogram as a single-path SVG (`src/components/brand/Logo.tsx:6`).

## Skipped or changed vs. the plan, and why
- **"Exportar a Word" on agent messages:** not added. CLAUDE.md decision 7 (no Word/PDF buttons on messages; documents auto-save) takes precedence.
- **Routes the plan named that don't exist:** `/tools/auditoria` and `/estudio/*`. The legacy routes redirect to the existing `/tools/analisis` and `/tools/estudiantes` instead.
- **Legacy 1,792-line `autoservicio/extraccion-datos` and 1,041-line `analisis-caso`:** deleted in favour of the existing `/tools/*` pages rather than ported. If you need features that only existed there, they're in git history before 7d9f6c7e.
- **`src/lib/pdf/*`:** switched to embedded EB Garamond (OFL TTFs in `public/fonts/`), but no app code imports these modules. `src/assets/fonts/SourceSans3-*.otf` are actually HTML files (pre-existing).
- **Pseudo "Precisión del resultado %" scores in the wizards:** removed as unsourced.
- **Phase 9:** landed as one commit, not one per directory. The redirects, `PLAN_DASHBOARDS` and the deletions had to land together to keep the build green.
- **CI:** `.github/workflows/ci.yml` runs a strict `next build`. If the build needs `NEXT_PUBLIC_*` env vars in CI, add them as repository variables or drop that step.

## Fixes found along the way (not in the plan)
- **Opacity modifiers on CSS-variable colours** (`border-avocat-gold/40` and similar, 227 uses) silently produced no CSS after Phase 0. Fixed with `color-mix` in `tailwind.config.js`.
- **Nested `data-theme` containers** inherited the outer theme's computed text colour, making text invisible on dark bands. Fixed with `[data-theme] { color: var(--text) }`.
- **Legacy reclamación/tutela pages** read `useDashboardAuth()`, which was never provided, so `userId` was empty. The moved pages use `useAppAuth()`.
- **Portaled modals in the app** render outside the shell. `<body>` gets `data-theme="dark"` while the app shell is mounted.

## Other notes
- `README-INSTALL.md` from the zip was moved into `design-system/v4/` instead of the repo root.
- Git-ignored Finder duplicates (`* 2.tsx`) were left untouched, including some inside the removed `src/app/dashboard/` folder; they aren't routes.
- Dev-only harness `/e2e/wizard` (`?proc=tutela`, `?theme=light`) renders the wizards without auth or payment. It returns 404 in production.

## Manual QA checklist
Open each page at **375 / 768 / 1280 px**. Public pages use the light theme with dark bands; the app is dark. Do one keyboard-only pass (visible focus ring) and one 200 % zoom pass.

**Public**
- [ ] `/`: hero, persona tabs, pricing shows 3 cards (75 € · 10 € · 3 €), "Hablar con ventas", TrustBand, footer legal line, "Configurar cookies" reopens the banner.
- [ ] Cookie banner: Rechazar and Aceptar have equal weight. After Rechazar, there is no request to googletagmanager or clarity (DevTools → Network). After Aceptar, both load.
- [ ] `/productos/gestion-abogados`, `/productos/autoservicio` (disclaimer under "Cómo funciona"), `/productos/material-estudiantes`.
- [ ] `/acerca-de`, `/contacto` (form submit), `/privacidad`, `/terminos`, `/cookies`, `/gdpr`, `/aviso-legal`.
- [ ] Navbar: `aria-current` on the active page; the mobile menu opens and closes with Esc.
- [ ] `/login`, `/signup` (plan radio cards, `?plan=abogados|particulares|estudiantes` preselects; Google button), `/forgot-password`, `/reset-password`, `/onboarding`, `/404`.

**App** (sign in as Abogados, then as a Particulares/Autoservicio user)
- [ ] `/panel`: KPIs, charts in the dark theme, Próximos vencimientos with StatusTag ("Vence mañana" / "Venció hace…").
- [ ] Rail and bottom nav: "Panel", icons, `aria-current`, profile panel opens; Perfil goes to `/settings/perfil`.
- [ ] `/cases`, `/cases?estado=urgente|proximo|a-tiempo|vencido`, `/cases/new`, `/cases/[id]`.
- [ ] `/clients`, `/documents` (table, preview, context menu, delete modal is destructive red, folders, Microsoft import), `/notifications`, `/legal-changes`, `/admin/legal-changes`, `/admin`.
- [ ] `/agent`:
  - Markdown answers (headings, lists, tables).
  - "Pensando…" while waiting.
  - **Detener** stops the answer and puts the prompt back.
  - Enter sends; Shift+Enter adds a new line.
  - Case chip when opened from a case.
  - Error shows **Reintentar**.
  - Sources block shows "No localizada".
  - Inline disclaimer.
  - Auto-save toast plus "Firmar y enviar" (DocuSign preview users).
- [ ] `/tools`, `/tools/generacion` (disclaimer above the result), `/tools/nda` (AI mode shows the disclaimer; the MFW template mode does not), `/tools/contrato-servicios`, `/tools/analisis`, `/tools/extraccion-datos`, `/tools/revision-email`, `/tools/estudiantes`.
- [ ] `/escritos/reclamacion-cantidad`: Datos (inline errors, "Guardado hace…") → Documentos → Revisión (paper preview, two ticks gate payment) → Pago. **Use Stripe test mode.** Return with `?payment=success` lands on Descarga. Cancelling shows "No se ha cobrado nada".
- [ ] `/escritos/accion-tutela` (same flow, COP quantity; pilot user path) and `/escritos/accion-tutela/historial`.
- [ ] `/settings/perfil` (DocuSign / Microsoft connect `returnTo`, signature pad, notifications) and `/settings/suscripcion`.
- [ ] Old bookmarks: `/dashboard`, `/dashboard/casos-urgentes`, `/profile` all redirect.

**Documents and emails**
- [ ] Word and PDF exports from the agent, generator and NDA tool are unchanged (Times New Roman, page breaks).
- [ ] DocuSign signing button is ink on gold.
- [ ] Contract alert email and Microsoft consent email render with the new colours.

## Next steps
1. Fill the TODOs above, starting with the three blocking ones.
2. Run the QA list.
3. `git push -u origin ds-v4` and open a PR into `dev`. Per CLAUDE.md, never push to `main`.
