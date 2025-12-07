let PDFDocument: any;

try {
  // Prefer the standard Node.js build when available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PDFDocument = require('pdfkit');
} catch {
  // Fall back to the standalone bundle that embeds font data
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PDFDocument = require('pdfkit/js/pdfkit.standalone');
}

export default PDFDocument;


