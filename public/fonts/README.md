# EB Garamond (document typeface)

Static TTFs (Latin subset) of EB Garamond by Georg Duffner and Octavio Pardo, from Fontsource
(`@fontsource/eb-garamond` 5.0.0). Licensed under the SIL Open Font License 1.1 — see `OFL-EBGaramond.txt`.

Used by generated legal documents: pdfkit (`src/lib/pdf/fonts.ts` → `registerDocumentFonts`), Word
exports and the `.legal-doc` CSS class (`--font-document`, loaded via next/font in the root layout).

# Document branding fonts (Identidad de marca)

Static TTFs (Regular / Bold / Italic) used by pdfkit when a user picks the font in Perfil →
Identidad de marca (`src/lib/branding.ts` `FONT_CATALOG` → `src/lib/pdf/fonts.ts`). Downloaded from
Google Fonts (fonts.gstatic.com static instances). All under the SIL Open Font License 1.1:

| Files | Font | Licence |
|---|---|---|
| `DMSans-*.ttf` | DM Sans | `OFL-DMSans.txt` |
| `Lato-*.ttf` | Lato | `OFL-Lato.txt` |
| `Carlito-*.ttf` | Carlito (metric-compatible with Calibri) | `OFL-Carlito.txt` |
| `Gelasio-*.ttf` | Gelasio (metric-compatible with Georgia) | `OFL-Gelasio.txt` |

Times New Roman and Arial use the standard PDF fonts (Times / Helvetica); EB Garamond uses the files above.
