Avocat is a Spanish-language legal AI platform for three audiences — lawyers, laypeople (*particulares*) and law students — in Spain and Latin America. The brand has to read as **precise enough for a despacho and calm enough for someone facing their first claim**. v4 keeps the v3 “warm legal-gold” direction (cream, near-black, gold, Garamond + DM Sans) and makes it systematic: two real themes on one set of roles, accessible pairs, one icon set, one shell.

## How to use this system

- Build with the **role tokens** (`bg`, `surface`, `text`, `text-muted`, `accent-text`, `focus`, `status-*`…), never with primitives (`gold-500`, `neutral-900`) and never with raw hex. Primitives exist for charts and the logo.
- Set the theme once: `data-theme="light"` on public pages (marketing, auth, legal) and `data-theme="dark"` on the app shell. Components never choose colours per theme.
- In the repo, use Tailwind classes generated from the tokens (`bg-surface`, `text-text-muted`, `border-border-strong`, `rounded-lg`, `shadow-md`, `z-modal`) and `src/lib/tokens.ts` for Chart.js, canvas and PDF. The CI guard (`scripts/check-design-tokens.mjs`) rejects raw hex, arbitrary colours and Tailwind default palettes.
- Components live in `components/` (React, namespace `AvocatDS`); each card's README says what it replaces in the repo.

## Content fundamentals

**Language.** UI copy is Spanish (es-ES by default; LATAM variants per country — see *Voice & tone*). No English UI words: Panel, not Dashboard; Demostración, not Demo; Plantilla, not Template; “Cumplimos el RGPD”, not “GDPR Compliant”. Brand and model names stay as they are (Avocat, GPT-4o, Stripe).

**Two registers, one voice.** Calm, exact, on the user's side.
- *Abogados*: precise legal vocabulary, citations, procedural terms (“Contestación a la demanda”, “días hábiles”, “NIG”). Short.
- *Particulares*: plain Spanish, the legal term once with an explanation (“un **monitorio** — un procedimiento rápido para reclamar deudas”), what happens next, what it costs.
- *Estudiantes*: Socratic, questions before answers.

**Address.** `tú` across product and marketing (already the case); legal documents generated for courts use the formal register of the document type. Legal pages may use `usted` but must be consistent within the page.

**Casing.** Sentence case everywhere (“Crear caso”, “Próximos vencimientos”). UPPERCASE only via the `label` style for eyebrows and KPI labels.

**Numbers.** Spanish formatting: `1.200`, `3.480,00 €`, `85 %`, `12 nov 2026`, `10:42`. Euro sign after the amount with a space. Never “€75”, never “1,200”.

**CTAs** say the outcome: “Probar 14 días gratis”, “Crear mi escrito”, “Descargar PDF”, “Continuar al pago · 10 €”. One primary CTA per view. Never “Comenzar”, “Click aquí”, “Enviar” alone.

**Claims.** Only claims Avocat can evidence: no uptime, “cifrado bancario”, “GDPR Compliant” or usage stats without a source page. Never “listo para presentar ante el juzgado” without the review disclaimer next to it.

**Emoji.** None in the interface. Users may write them; Avocat does not.

## Visual foundations

**Colour.** Cream (`bg` light = `neutral-50`) and near-black (`bg` dark = `neutral-950`) carry the brand; gold is an *accent*, used sparingly: the accent button, the italic accent words in headlines, the active rail marker, progress. Gold as text is always `accent-text` (`gold-800` on light, `gold-300` on dark) — the brand gold `#B8882A` is 2.91:1 on cream and is a fill only. Status colours come only from `status-*` tokens and always travel with an icon and a word.

**Type.** Cormorant Garamond for `display`, `h1`, `h2` — the voice of the brand, at 28px and above only. DM Sans for everything interactive and every heading below 24px (`h3`, `h4`), body (`body`, `body-sm` 14px in the app), and metadata. EB Garamond for legal documents (`doc-*`) on screen and in PDF/DOCX. A monospace stack for case numbers and tool ids. Floor: 12px (`caption`) for text, 11px only for the uppercase `label` style.

**Layout.** 4px spacing scale (`space-*`). Marketing: 12-column grid, `size-container` 1200px, sections `space-20` apart (`space-12` on mobile). App: `size-rail` 52px + `size-sidebar` 220px + content (+ `size-agent-panel` 400px ≥ 1280px); content max 1200 for dashboards, 760 for conversation, 720 (`size-prose`) for documents.

**Surfaces & depth.** Light: white `surface` cards on cream with `shadow-sm`. Dark: `surface` (`neutral-900`) on `bg` (`neutral-950`) separated by `border`, no shadow. Raised layers (menus, popovers) use `surface-raised` + `shadow-md`; modals `shadow-lg`.

**Shape.** `radius-md` (8) controls, `radius-lg` (12) cards, `radius-xl` (16) modals and pricing, `radius-full` tags and avatars. Nothing else.

**Focus.** Every interactive element shows a 2px solid `focus` ring with 2px offset on `:focus-visible` (≥ 3:1 on every surface in both themes). Never remove outlines.

**Motion.** `dur-fast` 120ms for hover/press, `dur-base` 180ms for menus and tabs, `dur-slow` 280ms for drawers and modals, `ease-standard`. No motion is decorative; everything honours `prefers-reduced-motion`.

**Imagery.** Product truth over stock: show the real interface (dark app on cream page). The three hero photos (`public/images/hero-*-background.png`, 1.3–5.4 MB PNGs, generated-looking stock, one with an orange-yellow “AVOCAT” logo on a tablet) are retired from heroes; if photography stays, use one consistent, warm, documentary style, WebP ≤ 200 KB, and never a fake logo in the photo.

**Paper.** Generated documents always render on white “paper” (`neutral-0`, `neutral-900` text, EB Garamond) in both themes — a document looks like a document.

## Iconography

One set: **Lucide** (`lucide-react`, ISC). Line icons, `currentColor`, 1.75 stroke at 20–24px and 2 at ≤ 16px; sizes 16 / 18 / 20 / 24. Icons sit beside text; an icon-only control always has an accessible name. The full emoji → Lucide map is on the **Icon** card. The agent is represented by `sparkle` on `surface-inverse`, never by a face or the logo.

## Logo

The framed calligraphic **A** + AVOCAT wordmark (Cormorant Garamond 600, +0.14em). Single inks only: ink on light, cream on dark, gold for the rail and favicon. Files in **Assets › Logos**; the blue `avocat-logo.svg` and the triangle placeholders in `public/logos/` are retired. See the **Logo** card.

## Trust, accessibility, responsive

Generated content always carries the **Revisa antes de presentar** disclaimer (see **AIDisclaimer**); every citation shows whether it was located in an authoritative source; uploads show a privacy note in place; cookie consent offers “Rechazar todas” as prominently as “Aceptar todas”; the footer carries the operator's legal identification. Target WCAG 2.2 AA in both themes; touch targets ≥ 44px; layouts are mobile-first at 375 / 768 / 1280. Details in *Patterns & guidelines*.
