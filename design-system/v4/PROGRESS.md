# DS v4 — progress

Branch `ds-v4` (from `main` @ 7eca9518). Not pushed.
Checks after every phase: `npm run build` (note: next.config has `ignoreBuildErrors`, so `npx tsc --noEmit` is also run — 23 pre-existing errors at start), `npm run lint:tokens`, `npm run lint:tokens:baseline`, `tests/unit` (Playwright node).

lint:tokens at start (no baseline): **5,806 violations in 118 files** (5,810 before the token files were swapped).

| Phase | Title | Status | Commit | lint:tokens after |
|---|---|---|---|---|
| 0 | Foundations | done | 6ea8c23b | 5,806 |
| 1 | Buttons & focus | done | 4b0dfb9d | 5,784 |
| 2 | AI disclaimer | done | 15efbd6e | 5,781 |
| 3 | Public chrome, legal id, consent | done | (this commit) | 5,756 |

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
