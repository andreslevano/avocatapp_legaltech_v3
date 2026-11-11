# Assessment — current state

Sources: live pages at https://avocatapp.com/ (`/`, `/productos/gestion-abogados`, `/productos/autoservicio`, `/productos/material-estudiantes`, `/acerca-de`, `/signup`, `/login`, `/contacto`, `/privacidad`, `/terminos`, `/cookies`, `/gdpr`, all fetched 11 Nov 2026) and the repo at `c5d8521`. Counts are from `src/` (`.ts`, `.tsx`, `.css`). **Assumption:** no logged-in screenshots were provided, so the app is assessed from code; anything about rendered app screens is marked *inferred*.

## 1. Brand & visual identity

**Is warm legal-gold + Garamond right?** Yes, keep it. For lawyers, a Garamond display face, cream paper tones and restrained gold signal craft, tradition and precision, and set Avocat apart from the blue-SaaS legaltech norm. For particulares the warmth reads as approachable rather than bureaucratic. The risks are execution, not direction:
- **Gold is used as text on light grounds**, where it can't pass contrast (`#B8882A` on `#F9F4EA` 2.91:1, on white 3.19:1). Fix: gold as fill; `accent-text` for text.
- **Cormorant Garamond is a display cut**, low x-height and thin hairlines. It is used for `h3` at 20px and in KPI numerals at 28–32px; below ~24px it gets light and hard to scan. v4 restricts it to ≥ 28px and moves `h3`/`h4` to DM Sans.
- **Two near-identical blacks** (`#1e1e1e` brand black, `#1e1c16` dark card) and two near-identical greige values (`#C8C0B0` border, `#c8c0ac` dark text) — merged in v4.

**Logo use and variants** (`src/components/brand/Logo.tsx`, `public/images`, `public/logos`):
- The only drawn mark is `avocat-logo-white-v1.png` (158×154 raster, white framed calligraphic A). The navbar shows it with a CSS `filter` approximating gold (`layout/Navbar.tsx`, `layout/Rail.tsx`).
- `variant="signature"` (default; used by `layout/Footer.tsx`) loads `/images/avocat-logo.svg` — a **blue `#2563EB` square with a system-ui “A”** — then applies `brightness(0)…sepia…` to force gold. The filter flattens the whole image to one colour, so it most likely renders as a solid gold square *(inferred)*.
- `variant="stacked"` loads `avocat-logo-full.svg`: “AVOCAT” as live `#F2F2F2` text in EB Garamond with fallbacks — invisible on cream, font-dependent.
- `public/logos/avocat-{symbol,stacked,signature}.svg` (gold triangle + Georgia text) are what `CLAUDE.md` specifies, but **nothing references them**; they look like placeholders.
- The product-page hero photo shows a tablet with an orange/yellow “AVOCAT” logo that matches none of the above.
- Wordmark casing alternates between AVOCAT and Avocat.

**Iconography.** 320 emoji used as icons in 39 files (✅ 62, ⚠ 45, ❌ 43, 📄 17, 📝 12, 📊 11…), including the live home trust badges (🔒⚡🌍), signup bullets (⚖📚🧑‍💼) and the flag selector (🇪🇸). The new shell (`layout/Rail.tsx`, `agent/AgentMessage.tsx`) pastes Heroicons outline paths inline. Emoji render differently per OS, can't take brand colour, and read as casual in a legal product. → **Lucide** (map on the Icon card).

**Imagery.** Three persona heroes (`public/images/hero-{abogados,autoservicio,estudiantes}-background.png`, 1.36 / 4.72 / 5.40 MB PNG, plus `hero-background.jpg`, which is actually a 1.58 MB PNG). Generic, generated-looking stock (boardroom, man on sofa, students with phones), set as CSS `background-image` with inline `style={{}}`, no `next/image` optimisation. They add ~13 MB of unoptimised weight and say nothing specific about the product. → show the product; if photography stays, one documentary style in WebP.

## 2. Consistency — what's actually in use

| Dimension | In use (src/) | Near-duplicates to merge | v4 |
|---|---|---|---|
| Colours | **58 distinct hex**; 489 raw hex literals; 360 `bg-[#…]`-style classes; 504 Tailwind default palette classes (red 178, green 84, blue 81, orange 37, yellow 33, gray 27, emerald 24, amber 19, purple 14, indigo 2) | `#1e1e1e`/`#1e1c16`/`#1a1812`/`#1a1a1a`; `#C8C0B0`/`#c8c0ac`; `#6b6050`/`#6b7280`/`#5f5f5f`; `#10b981`/`#059669`/`#28a745` (greens); `#dc2626`/`#ef4444` (reds); `#4a90e2`/`#3b82f6`/`#357abd` (blues); `#f2f2f2`/`#f8f9fa`/`#f9fafb`/`#e9ecef` (cold greys from a pre-v3 palette) | 2 ramps + 4 status scales; 31 roles; 8 legal statuses |
| Untokenised dark values | `#6b6050` 89×, `#2e2b20` 88×, `#c8c0ac` 61×, `#1e1c16` 39×, `#e8d4a0` 30×, `#252218` 27×, `#161410` 22×, `#3a3630` 18× — 374 literals, 208 of them in `src/app/(app)` | the `ds-*` tokens exist for 6 of these | roles via `data-theme` |
| Undefined classes | `bg-surface-muted` **259×**, `bg-accent-emphasis` 4× — not in `tailwind.config.js`, so no CSS is generated | — | `surface-muted` role |
| Font sizes | **31**: named `text-sm` 470, `text-xs` 165, `text-lg` 106, `text-2xl` 93, `text-small` 86, `text-body` 53, `text-base` 46, `text-xl` 42, `text-h2` 42, `text-h1` 19, `text-3xl` 16, `text-h3` 14, `text-4xl` 8, `text-label` 2, `text-6xl` 2, `text-5xl` 1; arbitrary `text-[12px]` 61, `[11px]` 51, `[13px]` 39, `[10px]` 27, `[20px]` 5, `[14px]` 5, `[16px]` 4, `[32px]`/`[22px]`/`[17px]`/`[15px]` 3, `[9px]`/`[28px]` 2, `[40px]`/`[26px]` 1 | v3 scale (`h1…label`) vs Tailwind scale used side by side; 13 vs 14 vs `text-sm` | 16 styles in 4 groups |
| Buttons | 224 raw `<button>` with **22 distinct background/radius signatures**; `ui/Button` used 44×; `.btn-primary` 31×, `.btn-secondary` 13× | `BtnGold` (white on gold) vs `.btn-primary` (black) vs `bg-blue-600` legacy | 5 variants × 3 sizes |
| Inputs | 114 `<input>`, 29 `<select>`, 14 `<textarea>`; `.input-field` used 30×; 86 `<label>` but only 28 `htmlFor` | placeholder-as-label in legacy forms | Field + 7 controls |
| Cards | `ui/Card` imported **0×**; `.card` + ad-hoc `bg-white`/`bg-card`/`bg-[#1e1c16]` containers | `rounded-xl` (Card) vs `rounded-lg` (pages) | 1 Card, 3 variants |
| Radii | `rounded-lg` 272, `rounded-full` 203, `rounded-md` 127, `rounded` 83, `rounded-xl` 71, `rounded-2xl` 12, `rounded-sm` 2, `rounded-none` 1 — 8 values; note the config overrides Tailwind so `rounded-md` = 8px, `rounded` = Tailwind's 4px | `rounded`/`rounded-sm`; `rounded-xl`/`rounded-2xl` | xs 4 · sm 6 · md 8 · lg 12 · xl 16 · full |
| Shadows | `shadow-sm` 78, `shadow-lg` 43, `shadow` 37, `shadow-md` 13, `shadow-xl` 10, `shadow-card` 10, `shadow-elevated` 5, `shadow-none` 3, `shadow-gold` 1, `shadow-2xl` 1 — 10 values, 7 of them Tailwind's cold-grey defaults | `shadow`/`shadow-sm`/`shadow-card`; `shadow-lg`/`shadow-xl`/`shadow-2xl` | sm · md · lg (per theme) |
| Inline styles | 30 `style={{}}` (hero backgrounds, Logo filter, progress widths) | — | tokens / classes |
| Typefaces | Cormorant Garamond, DM Sans (next/font); EB Garamond (favicon only); **Times New Roman** (`ReclamacionProcess.tsx:353`, `ReclamacionProcessSimple.tsx:880`), **Arial** (`ReclamacionProcess.tsx:671`, `dashboard/estudiantes/page.tsx:444`) in print previews; **Helvetica / Helvetica-Bold** ~180× in `src/lib/pdf/*.ts` (pdfkit) — the PDFs users file don't use the brand type at all | — | DM Sans / Cormorant / EB Garamond |
| Dark mode | Not a theme: `dark:` appears in 5 files; the app is “dark” because components hard-code dark hex | — | `data-theme` light/dark |

**Shells.** One `AppShellClient` (`layout/AppShellClient.tsx`) wraps both `src/app/(app)/layout.tsx` and `src/app/dashboard/layout.tsx`. Inside it:
- `(app)/*` pages (agent, cases, clients, documents, tools; 12 files, 2,167 lines) paint dark with raw hex (208 literals).
- `dashboard/*` pages (24 files, 10,332 lines) use the *light* semantic classes `text-text-primary` (225×, `#1e1e1e`), `bg-app` (cream), `bg-card` (white) and the undefined `bg-surface-muted`. *Inferred:* cream and white panels with near-black text inside a dark rail and sidebar. Any text that isn't inside a light panel is `#1e1e1e` on `#161410` (1.07:1).
- `/profile` and `/subscription` use `DashboardShell.tsx` + legacy `components/Sidebar.tsx` (light).
- The lawyer dashboard (KPIs) lives at the legacy path `src/app/dashboard/page.tsx`, while `CLAUDE.md` plans it at `(app)/dashboard`.

**Duplicate components:** `components/Sidebar.tsx` vs `layout/Sidebar.tsx`; `components/Footer.tsx` vs `layout/Footer.tsx`; `components/Header.tsx` vs `layout/Navbar.tsx`; `components/Hero.tsx` vs `landing/HeroSection.tsx`; `components/Pricing.tsx` vs `landing/PricingSection.tsx`; `DashboardShell.tsx` / `DashboardLayout.tsx` vs `AppShellClient.tsx`; `ReclamacionProcess.tsx` (744 lines) vs `ReclamacionProcessSimple.tsx` (1,444); `IndicatorCards.tsx`/`CaseStatistics.tsx` vs `dashboard/KPICard.tsx`; two `PLAN_DASHBOARDS` maps (`SignupForm.tsx`, `OnboardingStep.tsx`).

## 3. UX & information architecture

**Three-persona entry.** Home `PersonaTabs` + three product pages is a sound model, but labels change on the way: Abogados / Particulares / Estudiantes in the nav; “Autoservicio” on the pricing card; “Plan Particular” on its product page; “Abogado / Estudiante / Particular” (singular) at signup; plan ids `Abogados`/`Autoservicio`/`Estudiantes` in code. → one name per persona everywhere (Abogados, Particulares, Estudiantes), one `PLANS` constant.

**Signup → plan → onboarding.** `/signup` asks for the plan first (good) but offers 3 plans while pricing shows 4 + Enterprise; country is a 6-item select with “Mexico”, “Peru”; consent is implied (“Al continuar aceptas…”); errors are one banner (`setError`). After signup, routing differs per plan (`PLAN_DASHBOARDS`): Autoservicio lands on `/dashboard/autoservicio/revision-email` — an odd first screen for someone who came to file a claim. `AppShellClient` redirects to `/onboarding` if `plan`/`onboardingComplete` are missing, so the plan can be asked twice.

**Agent chat** (`agent/*`, `(app)/agent`). Messages render as plain text (`whitespace-pre-wrap`) — no Markdown, lists or links, so citations can't be structured; 13px text; user bubble white on gold (3.19:1); tool calls as a pulsing ⚡; placeholder 1.42:1; input removes its outline; no Stop button while streaming; an empty assistant bubble renders `''` on errors; no disclaimer.

**Case creation & detail** (`(app)/cases/new`, `(app)/cases/[id]`, 361 lines with 15 × `#6b6050`). Legacy duplicates: `dashboard/crear-caso`, `dashboard/casos`, `casos-urgentes`, `casos-a-tiempo`, `casos-vencidos` — three near-identical pages that should be filters of one list.

**Deadlines.** `dashboard/DeadlineList.tsx`: overdue and ≤ 3 days share `text-red-400 bg-red-400/10`; ≤ 7 days amber, else emerald — colour-only, 11–12px, and the same thresholds re-implemented in the `casos-*` pages. No calendar view, no días hábiles logic visible in the UI.

**Document generation wizards.** `ReclamacionProcessSimple.tsx` (1,444 lines) and `TutelaProcessSimple.tsx` (1,346): three steps — *1 Subir y analizar PDF → 2 Procesar pago → 3 Descargar*. **Payment comes before the user sees any output**; back navigation is a text link; the long-running state is an overlay spinner (“Generando Reclamación”); the AI note exists only inside the generated text (line 466). Step circles have numbers but no labels on mobile *(inferred)*.

**Upload / OCR / extraction** (`(app)/tools/extraccion-datos`, `dashboard/analisis-caso`, wizards). No standard dropzone; progress is a spinner rather than per-page OCR progress; results open in a success modal (`AnalisisExitoModal.tsx`) instead of a reviewable panel; no privacy cue next to the upload even though the home page claims documents “nunca se usan para entrenar modelos”.

**Repository** (`(app)/documents`, `dashboard/repositorio` 661 lines). Two implementations; no shared document card or status model.

**Subscription & payment (Stripe).** `/subscription` sits outside the app shell (legacy `DashboardShell`); credits/plan status isn't visible in the shell. Purchase history (`PurchaseHistory.tsx`, 1,182 lines) is its own design.

**Profile panel** (`layout/UserProfilePanel.tsx`, 4 × `#6b6050`). No language/country setting although `LanguageSelector` + 5 locale files exist (`public/locales/{es,en-GB,pt-BR,it,nl}/common.json`, ~188 keys each — most UI strings are hard-coded Spanish, so the translations cover only a fraction).

**States.**
- *Empty:* `DeadlineList` has one (“Sin vencimientos próximos”, 12px muted); most lists don't.
- *Loading:* full-screen spinner while auth resolves (`AppShellClient`); 61 `animate-spin`, 11 `animate-pulse`, no skeletons, no `motion-reduce`.
- *Error:* `ErrorBoundary.tsx` exists; inline errors are ad-hoc red text.
- *Long-running AI:* overlays with spinner, no steps, no ETA, no “you can leave”.

## 4. Content & microcopy

- **Registers.** Marketing uses `tú`; legal pages use `usted`. Particulares copy promises “sin conocimientos jurídicos” and documents “listos para presentar ante el juzgado” — overclaims for a layperson-facing AI product and in tension with the missing disclaimer.
- **English in the UI:** Dashboard, Dashboard KPIs, Demo / Demo interactivo / Ver demo, GDPR Compliant, Uptime, Template DOCX/PDF, LegalTech (title tag), Email in labels, Último Login.
- **Pricing contradictions:** Autoservicio €50/mes vs “Pago seguro por documento: sin suscripción” on its own page; “Solo escritos” €10 on home, absent from signup; product page sells “Plan Particular”.
- **Stat contradictions:** “Más de 1,200 casos gestionados” (home) vs “100+ Casos gestionados” (Abogados page); 85 % vs 80 % time saved; Estudiantes “8 áreas” (home) vs “10+ Áreas legales” (page lists 4). Number format is English (`1,200`, `99.9%`, `€75`).
- **CTA naming:** Prueba gratis 14 días → / Comenzar gratis / Comenzar / Empezar ahora / Empieza gratis → / Comenzar ahora / Crear mi documento / Explorar material — eight verbs for “sign up”.
- **Accents & casing:** Mexico, Peru; “Iniciar Sesión” vs “Iniciar sesión”.
- **LATAM vs Spain.** Acción de tutela is Colombian; reclamación de cantidades and monitorio are Spanish procedures; signup lists Chile, Ecuador, México, Perú with no product for them. Terms say Spanish law governs and prices are in euros for all markets. Copy should say per market what's available.

## 5. Accessibility (WCAG 2.2 AA)

Real token pairs, measured:

| Pair | Where | Ratio | Result |
|---|---|---|---|
| gold `#B8882A` on cream `#F9F4EA` | gold text, links, eyebrows | 2.91 | ✖ text, ✖ 3:1 UI |
| gold on white | prices, tag text | 3.19 | ✖ text |
| white on gold | `BtnGold`, user chat bubble, send button | 3.19 | ✖ |
| gold on gold-bg `#FDF3DC` | `Tag gold` | 2.89 | ✖ |
| `#9a9a9a` on white / cream | placeholders, helper text | 2.81 / 2.57 | ✖ |
| `#C8C0B0` border on white / cream | input borders | 1.81 / 1.65 | ✖ (1.4.11 needs 3:1) |
| `#6b6050` on `#161410` / `#1e1c16` / `#252218` | KPI labels, meta, sidebar | 2.99 / 2.77 / 2.59 | ✖ |
| `#3a3630` on `#1e1c16` | agent input placeholder | 1.42 | ✖ |
| `#2e2b20` on `#1e1c16` | dark borders (decorative) | 1.20 | ok if decorative; ✖ for inputs |
| `ds-text #c8c0ac` on `ds-card` / `card2` | body text dark | 9.40 / 8.78 | ✔ |
| `ds-head #e8d4a0` on `ds-card` | headings dark | 11.64 | ✔ |
| gold on `#161410` / `#1e1c16` | gold accents in dark | 5.78 / 5.35 | ✔ |
| `#5f5f5f` on cream / muted | secondary text light | 5.82 / 5.23 | ✔ |
| `#1e1e1e` on `#161410` | legacy text in dark shell *(inferred)* | 1.07 | ✖ |

- **Focus:** `focus-visible:` 4 occurrences, `focus:ring` 87 (gold ring 2px — ok on dark, 2.91:1 on cream ✖), `outline-none` 50 (often without a replacement).
- **Keyboard:** Rail items are links (ok) but have no visible focus; the mobile sidebar overlay has no focus trap *(inferred from code)*; PersonaTabs are buttons without `role="tab"`; the agent textarea sends on Enter (ok) with no label.
- **Labels:** 86 `<label>`, 28 `htmlFor` for 157 form controls → most controls rely on placeholder or proximity.
- **Touch targets:** sidebar collapse button `w-6 h-6` (24px); ToolCallBadge and tag buttons ~20px; only 3 elements explicitly ≥ 44px.
- **Motion:** no `prefers-reduced-motion` handling.
- **Status by colour only:** deadline pills, trend arrows coloured red/green.
- **Language:** `<html lang="es">` ✔.

## 6. Responsive (375 · 768 · 1280+)

- **Shell:** rail hidden < 768 and replaced by a fixed bottom nav (good); sidebar is fixed 220px with a slide-in overlay on mobile. 768–1023 shows rail + 220px sidebar, leaving ~500px for content *(inferred)*.
- **Tables:** 7 `<table>`s, 10 `overflow-x-auto` — tables scroll sideways on phones; no card fallback.
- **Agent chat:** `max-w-[75%]` bubbles at 13px; composer + bottom nav both fixed at the bottom on mobile, eating ~130px; on-screen keyboard overlap not handled *(inferred)*.
- **Marketing:** breakpoint usage `sm:` 372, `md:` 96, `lg:` 145, `xl:` 3 — tuned for phone → tablet, little for wide screens; heroes use 1.3–5.4 MB images on mobile.

## 7. Trust, legal & compliance UX (Spain/EU)

*Not legal advice — a design audit; confirm with counsel.*

- **AI output:** no “not legal advice / review before filing” in the UI; Terms §7 limits liability (“tal cual”) but don't say outputs must be verified. Needed on every generated document, in the agent, on product pages near “listo para presentar”, and in Terms. The EU AI Act's transparency duties (art. 50) were scheduled to apply from August 2026 — confirm current status with counsel, and say plainly in the UI that content is AI-generated either way.
- **Citations:** home claims “Jurisprudencia real — cita sentencias del TS, AP y TC”, but the agent shows citations as plain text. LLMs fabricate case law; show source, ECLI/BOE reference, verification status and a link.
- **Privacy cues near uploads:** none; the privacy policy lists “Documentos legales que sube a la plataforma” without saying they're excluded from training (the home page says they are).
- **Required legal pages:** no **aviso legal** / company identification (LSSI-CE art. 10: razón social, NIF, domicilio, registro, contacto) on any page; `/contacto` only says “Madrid, España”.
- **Cookies:** `/cookies` relies on “Al continuar utilizando nuestro sitio web, usted consiente…”; no banner, no reject. `src/app/layout.tsx` loads Google Ads `gtag` (AW-16479671897) and Microsoft Clarity `afterInteractive` with no consent gate. AEPD guidance requires prior consent for non-essential cookies, with rejecting as easy as accepting.
- **Privacy policy:** no legal basis per purpose (the /gdpr page lists bases generically), no retention periods, processors not named (OpenAI, Firebase/Google, Stripe, Google Analytics, Clarity, Zapier chatbot), no international-transfer specifics, no DPO or dedicated privacy contact.
- **Unbacked trust claims:** “GDPR Compliant”, “Cifrado bancario”, “99.9% Uptime”, “Soporte 24/7” — remove or link to evidence (security page, status page, DPA).
- **Consumer pricing:** for consumers, prices must be shown with taxes included; the site doesn't say whether €50/€10/€3 include IVA.
