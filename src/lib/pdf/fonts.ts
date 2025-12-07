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


