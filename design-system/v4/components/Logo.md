Logo renders the Avocat monogram (the framed calligraphic **A** from `public/images/avocat-logo-white-v1.png`, recoloured to single inks) with the AVOCAT wordmark set in Cormorant Garamond 600, +0.14em tracking.

**Consumer provides:** `variant` (`lockup` default · `mark` · `wordmark`), `tone` (`ink` on light, `cream` on dark, `gold` for the rail and favicon), `size` in px (mark height).

**Rules**
- The calligraphic A is the only drawn mark in the repo and the one the live navbar shows. It is canonical. Retire the stand-ins:
  - `public/images/avocat-logo.svg` is a **blue #2563EB “A”** in system-ui. `Logo variant="signature"` (the default, used in `layout/Footer.tsx`) loads it and then forces gold with a CSS filter, which flattens it to a solid square.
  - `public/logos/avocat-*.svg` (gold triangle + Georgia text) are placeholders named in `CLAUDE.md`, never referenced.
  - `avocat-logo-full.svg` is #F2F2F2 live text: invisible on cream and font-dependent.
- Clear space = the mark's height × 0.25 on all sides. Minimum mark 20px (favicon 16 uses the gold mark on ink).
- Inks: `ink` = `neutral-900`, `cream` = `neutral-50`, `gold` = `gold-500`. Logos are exempt from contrast minimums, but don't put the gold mark on cream below 24px.
- Wordmark is uppercase AVOCAT; running text writes “Avocat”.

**Do** export a vector (SVG, single path, `fill="currentColor"`) of the calligraphic A — the PNG is 158×154 raster. **Don't** recolour with `filter:`; ship one file per ink.
