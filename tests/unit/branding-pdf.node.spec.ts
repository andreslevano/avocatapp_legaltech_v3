// Server outputs (pdfkit / docx) with document branding.
import { test, expect } from '@playwright/test';
import { deflateSync } from 'zlib';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import { DEFAULT_BRANDING, FONT_CATALOG, resolveBranding, type FontId } from '@/lib/branding';
import type { ServerBranding } from '@/lib/branding-server';
import { applyBrandingFonts, drawBrandedHeader } from '@/lib/pdf/branding';
import { DOC_FONT } from '@/lib/pdf/fonts';
import { renderWordDocument } from '@/lib/pdf/word-generator';

function png(w = 30, h = 10): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h, 0x80);
  for (let y = 0; y < h; y++) raw[y * (w * 4 + 1)] = 0;
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const sb = (font: FontId, withLogo = true): ServerBranding => ({
  branding: resolveBranding({
    legalCompanyName: 'Bufete Pérez', legalIdType: 'NIF', legalIdNumber: 'B123',
    branding: { ...DEFAULT_BRANDING, font, colors: { primary: '#1f3a5f', secondary: '#5b6b7f' },
      ...(withLogo ? { logoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/l.png', logoWidth: 300, logoHeight: 100 } : {}) },
  }),
  logo: withLogo ? { bytes: png(), mime: 'image/png' } : null,
});

function pdf(draw: (doc: any) => void): Promise<string> {
  return new Promise((res, rej) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => res(Buffer.concat(chunks).toString('latin1')));
    doc.on('error', rej);
    draw(doc);
    doc.end();
  });
}

test('pdfkit: brand font embedded, header logo + primary rule', async () => {
  const out = await pdf(doc => {
    const b = sb('lato');
    applyBrandingFonts(doc, b);
    drawBrandedHeader(doc, b);
    doc.font(DOC_FONT.body).text('Texto con ñ y €');
  });
  expect(out).toMatch(/\/BaseFont \/[A-Z]{6}\+Lato-Bold/);
  expect(out).toMatch(/\/BaseFont \/[A-Z]{6}\+Lato-Regular/);
  expect(out).toContain('/Subtype /Image');
  expect(out).toMatch(/0\.1215\d* 0\.2274\d* 0\.3725\d* SCN/); // #1f3a5f stroke (header rule)
});

test('pdfkit: system fonts use standard PDF fonts; default branding keeps EB Garamond', async () => {
  const arial = await pdf(doc => { applyBrandingFonts(doc, sb('arial', false)); doc.font(DOC_FONT.body).text('x'); });
  expect(arial).toContain('/BaseFont /Helvetica');
  const dflt = await pdf(doc => { applyBrandingFonts(doc, null); drawBrandedHeader(doc, null); doc.font(DOC_FONT.body).text('x'); });
  expect(dflt).toMatch(/\+EBGaramond-Regular/);
  expect(dflt).not.toContain('/Subtype /Image');
});

test('pdfkit: every bundled brand font file exists and loads', async () => {
  for (const f of Object.values(FONT_CATALOG)) {
    if (!f.pdfkit.files) continue;
    await pdf(doc => { applyBrandingFonts(doc, sb(f.id, false)); doc.font(DOC_FONT.heading).text('á'); doc.font(DOC_FONT.italic).text('ñ'); });
  }
});

test('docx: header with logo, colours and default font', async () => {
  const buf = await renderWordDocument({ title: 'T', area: 'Civil', country: 'ES', content: 'Hola', type: 'study' }, sb('dm-sans'));
  const zip = await JSZip.loadAsync(buf);
  const header = await zip.file(/word\/header\d*\.xml/)[0].async('string');
  expect(header).toContain('BUFETE PÉREZ');
  expect(header).toContain('w:color w:val="1F3A5F"');
  expect(header).toContain('<w:bottom w:val="single" w:color="1F3A5F" w:sz="12"');
  expect(Object.keys(zip.files).some(f => /^word\/media\/.+\.png$/.test(f))).toBe(true);
  expect(await zip.file('word/styles.xml')!.async('string')).toContain('w:ascii="DM Sans"');
  const plain = await JSZip.loadAsync(await renderWordDocument({ title: 'T', area: 'Civil', country: 'ES', content: 'Hola', type: 'study' }));
  expect(plain.file(/word\/header\d*\.xml/)).toHaveLength(0);
});
