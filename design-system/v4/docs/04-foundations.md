# Foundations

Every value below is in `tokens.json` (Colors, Typography, Spacing, Radius, Shadows and the further families) and generated into `code/tailwind.config.js`, `code/globals.css` and `code/tokens.ts`. **What changed from v3 and why** is called out per family; everything not called out is kept exactly.

## Colour

### Primitives

Two ramps absorb every v3 value; four semantic scales are new.

- **gold** — `50` #fdf3dc · `100` #f8e8c2 · `200` #e8d4a0 · `300` #e8c97a · `400` #d2a54a · `500` #b8882a · `600` #a07824 · `700` #8c6920 · `800` #73561a · `900` #4a370f · `950` #2a2415
- **neutral** — `0` #ffffff · `50` #f9f4ea · `100` #ede8de · `200` #ddd6c8 · `300` #c8c0b0 · `400` #a39985 · `500` #857b6b · `600` #5e574b · `700` #3f3a31 · `800` #2e2b20 · `850` #252218 · `900` #1e1c16 · `950` #161410
- **success** — `50` #e5f1e8 · `300` #8fd0a6 · `600` #2e7048 · `700` #235a39 · `950` #13261a
- **warning** — `50` #fceedc · `300` #f5b871 · `600` #a3540a · `700` #844308 · `950` #2e1d0a
- **danger** — `50` #fbe8e5 · `300` #f4a094 · `600` #b3261e · `700` #8e1d17 · `950` #321311
- **info** — `50` #e6edf6 · `300` #9dbde6 · `600` #2e5c99 · `700` #234a7d · `950` #121f31

v3 → v4: `avocat-cream` = `neutral-50`, `avocat-muted` = `neutral-100`, `avocat-border` + `ds-text` = `neutral-300` (merged, indistinguishable), `avocat-gray5` ≈ `neutral-600` (warmed from #5f5f5f), `avocat-gray9` → `neutral-500` (placeholder role moves to `text-muted`), `ds-border` = `neutral-800`, `ds-card2` = `neutral-850`, `ds-card` = `neutral-900` (also absorbs `avocat-black` #1e1e1e — ΔE < 1), `ds-bg` = `neutral-950`, `avocat-gold-bg` = `gold-50`, `ds-head` = `gold-200`, `avocat-gold-l` = `gold-300`, `avocat-gold` = `gold-500`, Button hover #a07824 = `gold-600`, active #8c6920 = `gold-700`. The untokenised `#6b6050` is replaced by `neutral-400` (#a39985) for text.

### Roles — two themes, one set of names

Light is the public theme (marketing, auth, legal). Dark is the app shell. Both are complete; switching is `data-theme` on any ancestor.

| Role | Light | Dark | Use |
|---|---|---|---|
| `bg` | `neutral-50` #f9f4ea | `neutral-950` #161410 | Page background. Light = cream (marketing, auth, legal pages); dark = app shell. |
| `surface` | `neutral-0` #ffffff | `neutral-900` #1e1c16 | Cards, panels, inputs, sidebar (dark). |
| `surface-raised` | `neutral-0` #ffffff | `neutral-850` #252218 | Popovers, menus, hovered rows, assistant messages. Light relies on shadow-md. |
| `surface-muted` | `neutral-100` #ede8de | `neutral-850` #252218 | Table headers, inset areas, skeletons. Replaces the undefined bg-surface-muted (259 uses render transparent today). |
| `surface-inverse` | `neutral-900` #1e1c16 | `neutral-50` #f9f4ea | Inverted band (footer, primary button). |
| `border` | `neutral-300` #c8c0b0 | `neutral-800` #2e2b20 | Decorative dividers and card outlines (not a control boundary; exempt from 3:1). |
| `border-strong` | `neutral-500` #857b6b | `neutral-500` #857b6b | Input, checkbox and select boundaries — ≥3:1 on surface and bg in both themes. |
| `text` | `neutral-900` #1e1c16 | `neutral-300` #c8c0b0 | Body text on bg, surface, surface-raised, surface-muted. |
| `text-heading` | `neutral-900` #1e1c16 | `gold-200` #e8d4a0 | Headings and KPI values. Dark keeps the v3 warm-gold heading tone. |
| `text-muted` | `neutral-600` #5e574b | `neutral-400` #a39985 | Secondary text, captions, placeholders, table meta on every surface. |
| `text-inverse` | `neutral-50` #f9f4ea | `neutral-900` #1e1c16 | Text on surface-inverse. |
| `text-on-accent` | `neutral-900` #1e1c16 | `neutral-900` #1e1c16 | Text/icons on accent fills (gold). Ink, never white: white on gold is 3.19:1. |
| `accent` | `gold-500` #b8882a | `gold-500` #b8882a | Gold fills: accent button, selected tab underline, progress, active rail marker. Not text on light. |
| `accent-hover` | `gold-400` #d2a54a | `gold-300` #e8c97a | Hover state of accent fills. |
| `accent-text` | `gold-800` #73561a | `gold-300` #e8c97a | Gold as text or meaningful icon (links in body, eyebrow labels, prices). ≥4.5:1 on every surface. |
| `accent-subtle` | `gold-50` #fdf3dc | `gold-950` #2a2415 | Gold wash: selected rows, ‘Más popular’ card, presentado tag, info callouts. |
| `accent-border` | `gold-300` #e8c97a | `gold-800` #73561a | Border of accent-subtle areas (decorative). |
| `focus` | `gold-700` #8c6920 | `gold-300` #e8c97a | Focus ring: 2px solid + 2px offset. ≥3:1 on every surface in both themes. |
| `action-primary` | `neutral-900` #1e1c16 | `neutral-50` #f9f4ea | Primary button fill (black on light, cream on dark). |
| `action-primary-hover` | `neutral-700` #3f3a31 | `neutral-200` #ddd6c8 | Primary button hover. |
| `on-action-primary` | `neutral-50` #f9f4ea | `neutral-900` #1e1c16 | Label on action-primary. |
| `danger` | `danger-600` #b3261e | `danger-300` #f4a094 | Destructive button fill, error icon, invalid border. |
| `on-danger` | `neutral-0` #ffffff | `neutral-950` #161410 | Label on danger fill. |
| `danger-text` | `danger-700` #8e1d17 | `danger-300` #f4a094 | Error messages and field errors. |
| `success-text` | `success-700` #235a39 | `success-300` #8fd0a6 | Success messages. |
| `warning-text` | `warning-700` #844308 | `warning-300` #f5b871 | Warning messages. |
| `info-text` | `info-700` #234a7d | `info-300` #9dbde6 | Informational messages. |
| `danger-subtle` | `danger-50` #fbe8e5 | `danger-950` #321311 | Error alert background. |
| `success-subtle` | `success-50` #e5f1e8 | `success-950` #13261a | Success alert background. |
| `warning-subtle` | `warning-50` #fceedc | `warning-950` #2e1d0a | Warning alert background (incl. AI disclaimer). |
| `info-subtle` | `info-50` #e6edf6 | `info-950` #121f31 | Info alert background. |

**Rules**
- Gold as text → `accent-text`. Gold as fill → `accent`, with `text-on-accent` (ink) on top. Never white on gold.
- `border` is decorative (cards, dividers). Anything the user must find to operate — input outlines, checkbox boxes, switch tracks — uses `border-strong` (≥ 3:1).
- `focus` is the only focus colour, used as a 2px solid outline with 2px offset.
- Status and feedback colour never stands alone: icon + word.

### Legal status tokens

Each status has `status-<name>-bg`, `-fg`, `-border` per theme and a fixed Lucide icon. `vencido` and `pagado` are solid fills; the rest are subtle. `proximo` is an **intentional addition**: the code already distinguishes 4–7 days (amber) from ≤ 3 days, and without it “urgente” would cover both.

| Status | Icon | Light bg / fg | Dark bg / fg | fg contrast L / D | Meaning |
|---|---|---|---|---|---|
| `vencido` | `circle-x` | #b3261e / #ffffff | #f4a094 / #161410 | 6.54 / 9.02 | Plazo vencido (días < 0). Solid fill: the only filled red. |
| `urgente` | `alarm-clock` | #fbe8e5 / #8e1d17 | #321311 / #f4a094 | 7.60 / 8.33 | Vence en ≤ 3 días. |
| `proximo` | `clock` | #fceedc / #844308 | #2e1d0a / #f5b871 | 6.60 / 9.24 | Vence en 4–7 días (intentional addition: code already paints this amber). |
| `a-tiempo` | `circle-check` | #e5f1e8 / #235a39 | #13261a / #8fd0a6 | 6.97 / 8.90 | Vence en > 7 días. |
| `borrador` | `file-pen-line` | #ede8de / #5e574b | #252218 / #a39985 | 5.85 / 5.64 | Escrito o caso sin finalizar. |
| `en-revision` | `eye` | #e6edf6 / #234a7d | #121f31 / #9dbde6 | 7.59 / 8.57 | Pendiente de revisión humana. |
| `presentado` | `send` | #fdf3dc / #73561a | #2a2415 / #e8c97a | 6.19 / 9.60 | Presentado ante el juzgado / organismo. |
| `pagado` | `badge-check` | #2e7048 / #ffffff | #8fd0a6 / #161410 | 5.95 / 10.28 | Pago confirmado (Stripe). |

Deadline → status is one function (`deadlineStatus(daysLeft)` in `tokens.ts`): `< 0` vencido · `0–3` urgente · `4–7` próximo · `> 7` a tiempo.

**Colour-vision note.** Urgente/vencido (red) and a tiempo (green) differ in lightness as well as hue and always carry distinct icons (`alarm-clock`, `circle-x`, `circle-check`) and words, so they don't depend on red–green discrimination.

### Chart series

| Token | Light | Dark | Use |
|---|---|---|---|
| `chart-1` | #1e1c16 | #e8c97a | Series 1 / primary series. |
| `chart-2` | #b8882a | #c8c0b0 | Series 2. |
| `chart-3` | #2e5c99 | #9dbde6 | Series 3. |
| `chart-4` | #2e7048 | #8fd0a6 | Series 4. |
| `chart-5` | #a3540a | #f5b871 | Series 5. |
| `chart-6` | #a39985 | #857b6b | Series 6 / ‘otros’. |
| `chart-grid` | #ddd6c8 | #2e2b20 | Gridlines (decorative). |
| `chart-axis` | #5e574b | #a39985 | Axis labels and ticks. |

### Contrast — every role pair, both themes

WCAG 2.x ratios computed from the hex values. Minimum 4.5 for text, 3.0 for focus rings and control borders. **106 pairs, 0 failures.**

| Theme | Foreground | Background | Ratio | Min |
|---|---|---|---|---|
| light | `text` | `bg` | 15.54 | 4.5 |
| light | `text` | `surface` | 17.03 | 4.5 |
| light | `text` | `surface-raised` | 17.03 | 4.5 |
| light | `text` | `surface-muted` | 13.95 | 4.5 |
| light | `text-heading` | `bg` | 15.54 | 4.5 |
| light | `text-heading` | `surface` | 17.03 | 4.5 |
| light | `text-heading` | `surface-raised` | 17.03 | 4.5 |
| light | `text-heading` | `surface-muted` | 13.95 | 4.5 |
| light | `text-muted` | `bg` | 6.51 | 4.5 |
| light | `text-muted` | `surface` | 7.14 | 4.5 |
| light | `text-muted` | `surface-raised` | 7.14 | 4.5 |
| light | `text-muted` | `surface-muted` | 5.85 | 4.5 |
| light | `accent-text` | `bg` | 6.23 | 4.5 |
| light | `accent-text` | `surface` | 6.83 | 4.5 |
| light | `accent-text` | `surface-raised` | 6.83 | 4.5 |
| light | `accent-text` | `surface-muted` | 5.59 | 4.5 |
| light | `danger-text` | `bg` | 8.19 | 4.5 |
| light | `danger-text` | `surface` | 8.98 | 4.5 |
| light | `danger-text` | `surface-raised` | 8.98 | 4.5 |
| light | `danger-text` | `surface-muted` | 7.36 | 4.5 |
| light | `success-text` | `success-subtle` | 6.97 | 4.5 |
| light | `success-text` | `surface` | 8.10 | 4.5 |
| light | `warning-text` | `warning-subtle` | 6.60 | 4.5 |
| light | `warning-text` | `surface` | 7.53 | 4.5 |
| light | `info-text` | `info-subtle` | 7.59 | 4.5 |
| light | `info-text` | `surface` | 8.95 | 4.5 |
| light | `danger-text` | `danger-subtle` | 7.60 | 4.5 |
| light | `danger-text` | `surface` | 8.98 | 4.5 |
| light | `text` | `accent-subtle` | 15.44 | 4.5 |
| light | `accent-text` | `accent-subtle` | 6.19 | 4.5 |
| light | `text-on-accent` | `accent` | 5.35 | 4.5 |
| light | `text-on-accent` | `accent-hover` | 7.48 | 4.5 |
| light | `on-action-primary` | `action-primary` | 15.54 | 4.5 |
| light | `on-action-primary` | `action-primary-hover` | 10.29 | 4.5 |
| light | `on-danger` | `danger` | 6.54 | 4.5 |
| light | `text-inverse` | `surface-inverse` | 15.54 | 4.5 |
| light | `focus` | `bg` | 4.61 | 3.0 |
| light | `focus` | `surface` | 5.05 | 3.0 |
| light | `focus` | `surface-raised` | 5.05 | 3.0 |
| light | `focus` | `surface-muted` | 4.14 | 3.0 |
| light | `focus` | `accent-subtle` | 4.58 | 3.0 |
| light | `border-strong` | `bg` | 3.80 | 3.0 |
| light | `border-strong` | `surface` | 4.16 | 3.0 |
| light | `border-strong` | `surface-raised` | 4.16 | 3.0 |
| light | `border-strong` | `surface-muted` | 3.41 | 3.0 |
| dark | `text` | `bg` | 10.18 | 4.5 |
| dark | `text` | `surface` | 9.43 | 4.5 |
| dark | `text` | `surface-raised` | 8.80 | 4.5 |
| dark | `text` | `surface-muted` | 8.80 | 4.5 |
| dark | `text-heading` | `bg` | 12.57 | 4.5 |
| dark | `text-heading` | `surface` | 11.64 | 4.5 |
| dark | `text-heading` | `surface-raised` | 10.87 | 4.5 |
| dark | `text-heading` | `surface-muted` | 10.87 | 4.5 |
| dark | `text-muted` | `bg` | 6.53 | 4.5 |
| dark | `text-muted` | `surface` | 6.04 | 4.5 |
| dark | `text-muted` | `surface-raised` | 5.64 | 4.5 |
| dark | `text-muted` | `surface-muted` | 5.64 | 4.5 |
| dark | `accent-text` | `bg` | 11.45 | 4.5 |
| dark | `accent-text` | `surface` | 10.60 | 4.5 |
| dark | `accent-text` | `surface-raised` | 9.89 | 4.5 |
| dark | `accent-text` | `surface-muted` | 9.89 | 4.5 |
| dark | `danger-text` | `bg` | 9.02 | 4.5 |
| dark | `danger-text` | `surface` | 8.36 | 4.5 |
| dark | `danger-text` | `surface-raised` | 7.80 | 4.5 |
| dark | `danger-text` | `surface-muted` | 7.80 | 4.5 |
| dark | `success-text` | `success-subtle` | 8.90 | 4.5 |
| dark | `success-text` | `surface` | 9.52 | 4.5 |
| dark | `warning-text` | `warning-subtle` | 9.24 | 4.5 |
| dark | `warning-text` | `surface` | 9.71 | 4.5 |
| dark | `info-text` | `info-subtle` | 8.57 | 4.5 |
| dark | `info-text` | `surface` | 8.80 | 4.5 |
| dark | `danger-text` | `danger-subtle` | 8.33 | 4.5 |
| dark | `danger-text` | `surface` | 8.36 | 4.5 |
| dark | `text` | `accent-subtle` | 8.54 | 4.5 |
| dark | `accent-text` | `accent-subtle` | 9.60 | 4.5 |
| dark | `text-on-accent` | `accent` | 5.35 | 4.5 |
| dark | `text-on-accent` | `accent-hover` | 10.60 | 4.5 |
| dark | `on-action-primary` | `action-primary` | 15.54 | 4.5 |
| dark | `on-action-primary` | `action-primary-hover` | 11.78 | 4.5 |
| dark | `on-danger` | `danger` | 9.02 | 4.5 |
| dark | `text-inverse` | `surface-inverse` | 15.54 | 4.5 |
| dark | `focus` | `bg` | 11.45 | 3.0 |
| dark | `focus` | `surface` | 10.60 | 3.0 |
| dark | `focus` | `surface-raised` | 9.89 | 3.0 |
| dark | `focus` | `surface-muted` | 9.89 | 3.0 |
| dark | `focus` | `accent-subtle` | 9.60 | 3.0 |
| dark | `border-strong` | `bg` | 4.42 | 3.0 |
| dark | `border-strong` | `surface` | 4.09 | 3.0 |
| dark | `border-strong` | `surface-raised` | 3.82 | 3.0 |
| dark | `border-strong` | `surface-muted` | 3.82 | 3.0 |
| light | `status-vencido-fg` | `status-vencido-bg` | 6.54 | 4.5 |
| dark | `status-vencido-fg` | `status-vencido-bg` | 9.02 | 4.5 |
| light | `status-urgente-fg` | `status-urgente-bg` | 7.60 | 4.5 |
| dark | `status-urgente-fg` | `status-urgente-bg` | 8.33 | 4.5 |
| light | `status-proximo-fg` | `status-proximo-bg` | 6.60 | 4.5 |
| dark | `status-proximo-fg` | `status-proximo-bg` | 9.24 | 4.5 |
| light | `status-a-tiempo-fg` | `status-a-tiempo-bg` | 6.97 | 4.5 |
| dark | `status-a-tiempo-fg` | `status-a-tiempo-bg` | 8.90 | 4.5 |
| light | `status-borrador-fg` | `status-borrador-bg` | 5.85 | 4.5 |
| dark | `status-borrador-fg` | `status-borrador-bg` | 5.64 | 4.5 |
| light | `status-en-revision-fg` | `status-en-revision-bg` | 7.59 | 4.5 |
| dark | `status-en-revision-fg` | `status-en-revision-bg` | 8.57 | 4.5 |
| light | `status-presentado-fg` | `status-presentado-bg` | 6.19 | 4.5 |
| dark | `status-presentado-fg` | `status-presentado-bg` | 9.60 | 4.5 |
| light | `status-pagado-fg` | `status-pagado-bg` | 5.95 | 4.5 |
| dark | `status-pagado-fg` | `status-pagado-bg` | 10.28 | 4.5 |

## Typography

**Display serif vs UI sans.** Cormorant Garamond only at ≥ 28px (`display`, `h1`, `h2`, KPI numerals 34px, wizard titles 26px on mobile is the one exception at ≥ 24px). Below 24px it loses legibility. DM Sans for every interactive element, every heading below 24px and all body text. EB Garamond — the text cut of the same Garamond family, already used by the favicon — for legal documents, where long reading matters.

| Style | Family | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display` | display | 56/60 | 600 | -0.02em | Marketing hero only. 40/44 below 768px. |
| `h1` | display | 40/46 | 600 | -0.01em | Page title on marketing, auth and legal pages (v3 h1, kept). 32/38 below 768px. |
| `h2` | display | 28/34 | 600 | 0 | Section titles on marketing pages; app page titles (v3 h2, kept). |
| `h3` | sans | 20/28 | 600 | 0 | Card and panel titles. Sans from v4: Cormorant below 24px is too light to scan. |
| `h4` | sans | 16/24 | 600 | 0 | Sub-section titles, table group headers, modal titles on mobile. |
| `body-lg` | sans | 18/28 | 400 | 0 | Marketing lead paragraphs. |
| `body` | sans | 16/26 | 400 | 0 | Default body copy, form inputs on mobile (prevents iOS zoom). |
| `body-sm` | sans | 14/22 | 400 | 0 | App UI default: agent messages, tables, inputs on desktop. Replaces 13px chat text. |
| `small` | sans | 13/20 | 400 | 0 | Meta text, helper text, tag labels (v3 small, kept). |
| `caption` | sans | 12/16 | 400 | 0 | Chart axes, timestamps. Floor for running text — nothing smaller except label. |
| `label` | sans | 11/16 | 500 | 0.06em | Uppercase eyebrows and KPI labels only (v3 label, kept). Never for sentences. |
| `mono` | mono | 13/20 | 400 | 0 | Case numbers, NIG, references, tool-call names. |
| `doc-title` | document | 22/30 | 600 | 0.01em | Generated-document title in preview and PDF (centered, small caps). |
| `doc-heading` | document | 17/26 | 600 | 0 | HECHOS, FUNDAMENTOS DE DERECHO, SUPLICO. |
| `doc-body` | document | 17/28 | 400 | 0 | Long-form reading in the preview (max 72ch). Print: 12pt / 1.5. |
| `doc-note` | document | 14/20 | 400 | 0 | Footnotes, citations, the AI-review note at the foot of a draft. |

**Mobile:** `display` 40/44, `h1` 32/38, `h2` 24/30 (still Cormorant). Inputs use 16px text below 768px (prevents iOS zoom).

**Numbers:** `font-variant-numeric: tabular-nums` in tables, KPIs, money and dates; `lining-nums` in Cormorant numerals.

**Legal document reading style** (`.legal-doc`, DocumentPreview): EB Garamond 17/28, measure ≤ 720px (~72 characters), justified with hyphenation, title centred in small caps, section headings (HECHOS, FUNDAMENTOS DE DERECHO, SUPLICO) uppercase 600, notes 14/20 italic.

**Print / PDF / DOCX style** (replaces Times New Roman and Arial in previews and Helvetica in `src/lib/pdf/*`): A4, margins 25 mm top/right/bottom, 30 mm left (binding), EB Garamond 12pt / 1.5, headings 12–14pt, page numbers bottom centre “Página n de N”, the AI note as the last line until the user confirms review. Embed the font (EB Garamond, SIL OFL) with pdfkit `registerFont`; DOCX declares “EB Garamond” with “Garamond” fallback. Where a court, registry or user requires Times New Roman, use `.legal-doc--official` — a documented exception, not a hard-code.

**Fonts load** with `next/font/google` (Cormorant Garamond 400–700 + italic, DM Sans 300–600, EB Garamond 400/600 + italic), `display: swap`, CSS variables `--font-display`, `--font-sans`, `--font-document`.

## Spacing, grid & layout

**Spacing** — 4px base: `space-0-5` 2 · `space-1` 4 · `space-1-5` 6 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48 · `space-16` 64 · `space-20` 80 · `space-24` 96. Tailwind's numeric scale stays (same 4px grid); arbitrary values (`p-[13px]`) are not allowed.

**Breakpoints** (mobile-first, Tailwind defaults kept): `bp-sm` 640 · `bp-md` 768 · `bp-lg` 1024 · `bp-xl` 1280 · `bp-2xl` 1536. Design and QA at **375, 768, 1280**.

**Containers:** marketing `size-container` 1200 with 24px gutters (16 on mobile); legal pages and document preview `size-prose` 720; agent conversation 760; dashboards fluid to 1200.

**Marketing grid:** 12 columns, 24px gutter ≥ 1024; 8 columns 768–1023; 4 columns < 768. Hero 7/5 split (copy / product), feature rows 4×3, pricing 3 cards + ventas link. Section rhythm `space-20` (desktop) / `space-12` (mobile).

**App shell**

```
≥1280   | rail 52 | sidebar 220 | content (fluid, max 1200)        | agent panel 400 (optional) |
1024+   | rail 52 | sidebar 220 | content                                                       |
768+    | rail 52 | content — sidebar toggles as overlay (panel-left button in header)            |
<768    | header 56 · content · bottom nav 64 (5 items) — sidebar & agent open as drawers/sheets |
```

Header 56px sticky with page title (Cormorant 22) and actions; content padding `space-6` (`space-4` < 768).

## Radius, elevation, borders, z-index, motion

**Radius** — `radius-xs` 4 (checkbox, table tags, tool badges) · `radius-sm` 6 (small buttons, chips) · `radius-md` 8 (buttons, inputs, menu items) · `radius-lg` 12 (cards, dropdowns, dropzones) · `radius-xl` 16 (modals, drawers, pricing, composer) · `radius-full` (tags, avatars, switches). v3's `2xl` (24px, 12 uses) maps to `xl`.

**Elevation** — three levels, per theme. Light: `shadow-sm` (v3 `shadow-card`, cards), `shadow-md` (v3 `elevated`, menus/popovers/toasts), `shadow-lg` (modals/drawers). Dark: borders separate surfaces; shadows only for floating layers. Tailwind's cold-grey `shadow`, `shadow-xl`, `shadow-2xl` map onto these.

**Borders** — 1px everywhere; 1.5px for checkbox/radio/switch outlines and the dashed dropzone; 2px for invalid inputs, focus rings and the selected plan. Colours: `border` (decorative), `border-strong` (controls), `accent-border` (accent areas), `danger` (invalid).

**Z-index** — `z-base` 0 · `z-raised` 10 · `z-sticky` 100 · `z-nav` 200 · `z-drawer` 300 · `z-overlay` 400 · `z-modal` 500 · `z-popover` 600 · `z-toast` 700 · `z-tooltip` 800.

**Motion** — `dur-fast` 120ms (hover, press, focus) · `dur-base` 180ms (menus, tabs, toasts) · `dur-slow` 280ms (drawers, modals) · `ease-standard` cubic-bezier(0.2, 0, 0, 1) · `ease-exit` cubic-bezier(0.4, 0, 1, 1). Streaming caret blinks at 1s. **Reduced motion:** all transitions and animations collapse to ~0ms (`globals.css`), spinners become a static icon + text, skeleton shimmer stops, smooth scroll turns off.

## Iconography

**Lucide** (`lucide-react`, pinned) — chosen over a custom set because it already covers the legal vocabulary (`scale`, `gavel`, `landmark`, `file-pen-line`, `scroll-text`, `alarm-clock`, `badge-check`), its geometric line style matches DM Sans, it's ISC-licensed and tree-shakeable, and the current inline paths in the app are the same visual family (Heroicons outline). Sizes 16 / 18 / 20 / 24; stroke 1.75 (2 at ≤ 16); `currentColor`; 24×24 grid. The full emoji → icon map is on the **Icon** card.
