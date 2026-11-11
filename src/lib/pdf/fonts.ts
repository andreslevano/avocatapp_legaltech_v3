import path from 'path';
import fs from 'fs';

const FONT_DIRECTORY = path.join(process.cwd(), 'src', 'assets', 'fonts');
const REGULAR_FONT_PATH = path.join(FONT_DIRECTORY, 'SourceSans3-Regular.otf');
const BOLD_FONT_PATH = path.join(FONT_DIRECTORY, 'SourceSans3-Bold.otf');

export const PDF_FONT_PATHS = {
  regular: REGULAR_FONT_PATH,
  bold: BOLD_FONT_PATH,
};

export const PDF_FONT_FAMILY = {
  regular: 'AvocatSans-Regular',
  bold: 'AvocatSans-Bold'
} as const;

export const applyPdfFonts = (doc: any) => {
  if (!fs.existsSync(REGULAR_FONT_PATH) || !fs.existsSync(BOLD_FONT_PATH)) {
    throw new Error('Las fuentes de Avocat para PDF no están disponibles en el servidor.');
  }

  doc.registerFont(PDF_FONT_FAMILY.regular, REGULAR_FONT_PATH);
  doc.registerFont(PDF_FONT_FAMILY.bold, BOLD_FONT_PATH);
};



// ── DS v4 document typeface: EB Garamond (OFL, public/fonts) ──────────────────────────────
// pdfkit names used by the legal-document generators. If the TTFs are missing at runtime the
// standard PDF fonts are used instead, so generation never fails because of typography.
const DOC_FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
const DOC_FONT_FILES = {
  body: path.join(DOC_FONT_DIR, 'EBGaramond-Regular.ttf'),
  heading: path.join(DOC_FONT_DIR, 'EBGaramond-SemiBold.ttf'),
  italic: path.join(DOC_FONT_DIR, 'EBGaramond-Italic.ttf'),
};

export const DOC_FONT = { body: 'Body', heading: 'Heading', italic: 'Body-Italic' } as const;

const STANDARD_FALLBACK: Record<keyof typeof DOC_FONT, string> = {
  body: 'Times-Roman',
  heading: 'Times-Bold',
  italic: 'Times-Italic',
};

/** Register Body / Heading / Body-Italic on a pdfkit document. Call right after `new PDFDocument()`. */
export function registerDocumentFonts(doc: any): void {
  (Object.keys(DOC_FONT) as (keyof typeof DOC_FONT)[]).forEach(k => {
    const file = DOC_FONT_FILES[k];
    try {
      if (fs.existsSync(file)) doc.registerFont(DOC_FONT[k], file);
      else doc.registerFont(DOC_FONT[k], STANDARD_FALLBACK[k]);
    } catch {
      doc.registerFont(DOC_FONT[k], STANDARD_FALLBACK[k]);
    }
  });
}
