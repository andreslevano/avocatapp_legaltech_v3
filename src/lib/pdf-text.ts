// PDF text layer, server-only. pdf-parse 2.x exposes a PDFParse class; 1.x was a function — the
// old `pdfParse(buffer)` call silently returned nothing after the upgrade. Use this everywhere.

export async function pdfText(buf: Buffer | Uint8Array): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('pdf-parse');
  if (typeof mod === 'function') return (await mod(Buffer.from(buf))).text ?? '';
  const parser = new mod.PDFParse({ data: new Uint8Array(buf) });
  try {
    return (await parser.getText()).text ?? '';
  } finally {
    await parser.destroy?.()?.catch?.(() => {});
  }
}
