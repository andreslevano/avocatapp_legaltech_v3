# Claude Code prompts — Avocat Design System v4

Run each phase on its own branch, in a fresh `claude` session, from the repo root.
Before each prompt press **Shift+Tab** to enter plan mode, review the plan, then approve.
After each phase: `npm run build && npm run lint:tokens`, check the pages in `npm run dev`, commit, open a PR.

---

## Phase 0 — Foundations (branch `ds-v4/foundations`)

```
You are applying Avocat Design System v4 to this repo. Spec lives in design-system/v4/ (read README-first: design-system/v4/PLAN.md, design-system/v4/CLAUDE-section.md, design-system/v4/docs/04-foundations.md). Do ONLY Phase 0 (when run from RUN.md, continue to the next phase afterwards).

1. CLAUDE.md: replace the whole section "## DESIGN SYSTEM v3 — TOKENS EXACTOS" (up to the next "---") with the contents of design-system/v4/CLAUDE-section.md. Leave the rest of CLAUDE.md untouched.
2. Copy design-system/v4/tailwind.config.js -> tailwind.config.js (overwrite).
3. Copy design-system/v4/globals.css -> src/styles/globals.css (overwrite), then re-append the existing "Zapier chatbot" override block from the old file at the end.
4. Copy design-system/v4/tokens.ts -> src/lib/tokens.ts (overwrite). Find every import from '@/lib/tokens' and fix any names that no longer exist (old: colors, fonts, fontSizes, lineHeights, radii, shadows, chartColors) by mapping to the new exports (primitives, themes, fonts, type, radius, chartTheme). Do not change visual behaviour.
5. src/app/layout.tsx: add EB_Garamond from next/font/google (weights 400 and 600, normal+italic, variable '--font-document', display 'swap'), add its variable class to <html>, and add data-theme="light" to <html>.
6. src/components/layout/AppShellClient.tsx: put data-theme="dark" on the outermost shell div AND on the loading-state div; replace bg-[#161410] with bg-bg in this file only.
7. Copy design-system/v4/assets/logos/*.png -> public/brand/ .
8. package.json scripts: "lint:tokens": "node scripts/check-design-tokens.mjs --baseline .ds-baseline.json", "lint:tokens:baseline": "node scripts/check-design-tokens.mjs --baseline .ds-baseline.json --update-baseline". Run lint:tokens:baseline and keep .ds-baseline.json.
9. npm install lucide-react (pin the exact installed version in package.json, no caret).
10. Run npm run build. Fix only errors caused by these changes. Then run npm run lint:tokens (must pass).

Rules: no other refactors in this phase. Note in PROGRESS.md: files changed, build result, lint:tokens summary, and anything that looked visually risky.
```

---

## Phase 1 — Buttons & focus (branch `ds-v4/button`)

```
Follow CLAUDE.md design system v4. Spec: design-system/v4/components/Button.md, IconButton.md, TextLink.md; reference implementation in design-system/v4/reference/bundle.js (search "function Button") and bundle.css (.av-btn).
1. Rewrite src/components/ui/Button.tsx with variants primary | accent | secondary | ghost | destructive, sizes sm | md | lg, props icon, iconRight (lucide-react components), loading + loadingText, block, href. Keep backwards compatibility for one release: map BtnDark->primary, BtnGold->accent, BtnOutlineDark/BtnOutlineGold->secondary, BtnGhost->ghost with a console.warn in development.
2. Add src/components/ui/IconButton.tsx (required label -> aria-label + title).
3. Replace every usage of .btn-primary / .btn-secondary classes in src/ with <Button>. Accent buttons use text-text-on-accent (ink), never text-white.
4. Remove focus:outline-none / focus:ring-* from buttons and links you touch (global :focus-visible handles it).
Run build + lint:tokens; lower the baseline (npm run lint:tokens:baseline) if counts dropped. Report the diff summary.
```

## Phase 2 — AI disclaimer (branch `ds-v4/disclaimer`)

```
Follow CLAUDE.md design system v4. Spec: design-system/v4/components/AIDisclaimer.md (copy is FIXED — use it verbatim) and docs/06-patterns.md "Trust & compliance patterns".
1. Create src/components/ui/AIDisclaimer.tsx with variant "block" | "inline" using role tokens (bg-warning-subtle, text-warning-text, TriangleAlert icon).
2. Place the block variant: above every generated-document preview and on the download/export step in ReclamacionProcessSimple.tsx, ReclamacionProcess.tsx, TutelaProcessSimple.tsx, src/app/(app)/tools/generacion and dashboard/generar-escritos.
3. Place the inline variant under src/components/agent/AgentInput.tsx.
4. On src/app/productos/autoservicio/page.tsx change "listo para presentar ante el juzgado" to "listo para revisar y presentar" and add the block disclaimer next to it.
Build + lint:tokens. Report every place you added it.
```

## Phase 3 — Public chrome, legal identification, consent (branch `ds-v4/public`)

```
Follow CLAUDE.md design system v4. Specs: design-system/v4/components/Navbar.md, Footer.md, CookieBanner.md, ProductsMenu.md.
1. Move src/app/{acerca-de,contacto,privacidad,terminos,cookies,gdpr,productos} under src/app/(public)/ so they use (public)/layout.tsx (Navbar + layout/Footer). Remove their imports of components/Header and components/Footer. Delete components/Header.tsx and components/Footer.tsx once unused.
2. Navbar items exactly: Abogados, Particulares, Estudiantes, Precios (/#precios), Nosotros | Iniciar sesión, "Probar 14 días gratis". aria-current on the active page. Mobile: menu button opening a drawer.
3. Footer: one set of social links (default in RUN.md, as a constant in src/lib/company.ts), "Configurar cookies" link, and the legal line with placeholders: "© 2026 [RAZÓN SOCIAL] · NIF [NIF] · [DOMICILIO] · [REGISTRO MERCANTIL] · soporte@avocatapp.com · Avocat no es un despacho de abogados y no presta asesoramiento jurídico." Put placeholders in src/lib/company.ts.
4. Create src/app/(public)/aviso-legal/page.tsx using src/lib/company.ts.
5. CookieBanner (src/components/legal/CookieBanner.tsx): Rechazar todas and Aceptar todas with equal weight, Configurar with Analíticas/Publicidad toggles off by default, consent stored in a first-party cookie. In src/app/layout.tsx load Google Ads gtag and Microsoft Clarity ONLY after consent; initialise Google Consent Mode v2 with everything denied.
Build + lint:tokens. List the TODO placeholders I must fill.
```

## Phase 4 — Single pricing source (branch `ds-v4/plans`)

```
Follow CLAUDE.md design system v4. Spec: design-system/v4/components/PlanCard.md and docs/07-redesign.md "Pricing".
1. Create src/lib/plans.ts exporting PLANS (id, name, price, unit, forWho, features, cta, fine, featured, stripePriceId) for: abogados 75 €/mes (14 días gratis, featured), particulares 10 €/escrito, estudiantes 3 €/escrito; plus SALES_CONTACT for Empresas. Reuse the existing Stripe price ids from the code; leave TODO where unclear.
2. Use PLANS in landing/PricingSection.tsx, auth/PlanCards.tsx, the three productos pages, ProductsDropdown.tsx. Unify plan ids so ?plan= and PLAN_DASHBOARDS use them (single PLAN_DASHBOARDS in src/lib/plans.ts).
3. Spanish number format everywhere you touch: "75 €", "1.200", "85 %". Remove the unsourced stats (1,200 casos, 100+ casos, 85%/80%, 99.9% Uptime, 10+ áreas) and badges "GDPR Compliant", "Cifrado bancario" — replace with the proof points in docs/07-redesign.md.
4. Replace English UI words per docs/05-voice-and-tone.md glossary in the files you touch.
Build + lint:tokens.
```

## Phase 5 — Logo & icons (branch `ds-v4/brand`)

```
Follow CLAUDE.md design system v4. Specs: design-system/v4/components/Logo.md, design-system/v4/ICONS.md.
1. Rewrite src/components/brand/Logo.tsx: variants mark | wordmark | lockup, tone ink | cream | gold using /brand/avocat-mark-{tone}.png; wordmark "AVOCAT" in font-display 600, tracking 0.14em. No CSS filters.
2. Replace src/app/icon.svg with a 32px icon: neutral-900 square, gold mark (use the PNG via an icon.png route if SVG can't embed it).
3. Delete public/images/avocat-logo.svg, avocat-logo-full.svg, "avocat-logo 2.svg", "avocat logo white v1.png" and public/logos/* after confirming no references remain.
4. Replace emoji used as icons in JSX with lucide-react icons using the map in ICONS.md (sizes 16/18/20/24, currentColor). Start with layout/, landing/, auth/, agent/, dashboard/; then the rest. Replace the inline Heroicons paths in layout/Rail.tsx and agent/AgentMessage.tsx with Lucide.
Build + lint:tokens.
```

## Phase 6 — Dark app: raw hex sweep (branch `ds-v4/app-tokens`)

```
Follow CLAUDE.md design system v4. Apply the "Find / replace map" in design-system/v4/PLAN.md to src/app/(app)/** and src/components/{layout,agent,dashboard}/** ONLY. Use role classes (bg-bg, bg-surface, bg-surface-raised, border-border, text-text, text-text-heading, text-text-muted, text-accent-text, bg-accent + text-text-on-accent). Replace status colour logic with deadlineStatus() from @/lib/tokens and a new src/components/ui/StatusTag.tsx (spec: components/StatusTag.md). Map arbitrary text sizes per the table (12px floor; text-label only for uppercase eyebrows). Go file by file; after each directory run build and lint:tokens and lower the baseline.
```

## Phase 7 — Agent (branch `ds-v4/agent`)

```
Follow CLAUDE.md design system v4. Specs: components/AgentMessage.md, AgentComposer.md, AgentChat.md, ToolCallBadge.md, ContextChips.md, CitationBlock.md, AIDisclaimer.md; visual target screens/ScreenAgent.md; reference code in reference/bundle.js.
Rebuild src/components/agent/*: Markdown rendering (react-markdown, no raw HTML), 15/24 text, user turn on bg-surface-raised, assistant full-width with avatar, ToolCallBadge states running/done/error, superscript citation links -> CitationBlock with verified flag (add a `sources` field to the message type; leave verification as a TODO server hook), Stop button while streaming, inline error with Reintentar instead of empty bubbles, role="log" aria-live="polite". Composer: labelled textarea, Enter sends / Shift+Enter newline, visible placeholder, focus-within ring, context chips, inline disclaimer.
```

## Phase 8 — Document wizard (branch `ds-v4/wizard`)

```
Follow CLAUDE.md design system v4. Specs: components/Stepper.md, FileDropzone.md, DocumentPreview.md, AIJobProgress.md; target screens/ScreenWizardMobile.md.
Extract a generic src/components/wizard/DocumentWizard.tsx with steps Datos -> Documentos -> Revisión -> Pago -> Descarga (review BEFORE payment), driven by a per-procedure config. Port ReclamacionProcessSimple.tsx first (keep its API calls, Stripe and Firestore logic intact), then TutelaProcessSimple.tsx. Use FileDropzone with OCR progress + privacy note, DocumentPreview with .legal-doc (EB Garamond) and highlighted extracted data, two confirmations before payment, AIJobProgress for generation, sticky 48px CTA on mobile. Delete ReclamacionProcess.tsx when unused. Also switch src/lib/pdf/*.ts from Helvetica to embedded EB Garamond (registerFont; add the TTFs under public/fonts with the OFL licence).
```

## Phase 9 — Retire /dashboard (branch `ds-v4/routes`)

```
Follow CLAUDE.md design system v4. Using the route table in design-system/v4/PLAN.md section 2, move each /dashboard/* page into src/app/(app)/*, rebuilding the UI with v4 components (Card, KPICard, DataTable, StatusTag, DeadlineItem…; specs in design-system/v4/components/). Turn casos-urgentes/a-tiempo/vencidos into ?estado= filters on /cases. Move /profile and /subscription to (app)/settings/*. Add 301 redirects for every old path in next.config.js, update PLAN_DASHBOARDS, then delete src/app/dashboard/, DashboardShell.tsx, DashboardLayout.tsx, DashboardNavigation.tsx, components/Sidebar.tsx and other files the plan lists once unreferenced. One directory per commit.
```

## Phase 10 — Lock it (branch `ds-v4/strict`)

```
Set AVOCAT_STRICT_COLORS=1 for build in CI, remove the deprecated v3 aliases (avocat-*, ds-*, app, card, sidebar, text-primary, text-secondary, text-on-dark) and the legacy .btn-*/.card/.input-field classes from tailwind.config.js and globals.css, fix whatever stops compiling, make lint:tokens run in CI with the baseline, and target a baseline of 0.
```
