// Document branding for pdfkit generators (server). Fonts: registerDocumentFonts(doc, font) in
// ./fonts. Header: drawBrandedHeader — same layout as the HTML documents (src/lib/doc-html.ts).

import type { ServerBranding } from '../branding-server';
import { DOC_FONT, registerDocumentFonts } from './fonts';

const MM = 72 / 25.4;
const LOGO_MAX_H = 18 * MM;
const LOGO_MAX_W = 53 * MM;

/** Register the document fonts (brand font if the branding isn't Avocat's default). */
export function applyBrandingFonts(doc: any, sb?: ServerBranding | null): void {
  registerDocumentFonts(doc, sb && !sb.branding.isDefault ? sb.branding.font : undefined);
}

/**
 * Logo + company/NIF + date with a 1.5pt rule in the primary colour, at the current top margin.
 * Leaves doc.y below the header. No-op for default branding (generators keep their own layout).
 * pdfkit embeds PNG and JPEG only: logos are stored as PNG/JPEG (the profile converts WebP).
 */
export function drawBrandedHeader(doc: any, sb?: ServerBranding | null, date = new Date()): void {
  if (!sb || sb.branding.isDefault) return;
  const b = sb.branding;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;
  let textX = left;
  let logoW = 0, logoH = 0;

  const canEmbed = sb.logo && /^image\/(png|jpeg)$/.test(sb.logo.mime);
  if (sb.logo && !canEmbed) console.warn(`[pdf] logo type ${sb.logo.mime} not supported by pdfkit — header without logo`);
  if (canEmbed && b.logo) {
    const scale = Math.min(LOGO_MAX_H / b.logo.height, LOGO_MAX_W / b.logo.width);
    logoW = b.logo.width * scale; logoH = b.logo.height * scale;
    const x = b.logo.position === 'right' ? right - logoW : left;
    try {
      doc.image(sb.logo!.bytes, x, top, { fit: [logoW, logoH] });
      if (b.logo.position !== 'right') textX = left + logoW + 12;
    } catch (e) {
      console.warn('[pdf] logo not embeddable:', (e as Error).message);
      logoW = logoH = 0;
    }
  }
  const textRight = b.logo?.position === 'right' && logoW ? right - logoW - 12 : right;
  const dateStr = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.font(DOC_FONT.heading).fontSize(9).fillColor(b.primary)
    .text(b.header.authorName.toUpperCase(), textX, top, { width: textRight - textX - 110, characterSpacing: 0.5 });
  if (b.header.authorNif) doc.font(DOC_FONT.body).fontSize(8).fillColor(b.secondary).text(b.header.authorNif, textX, doc.y, { width: textRight - textX - 110 });
  const textBottom = doc.y;
  doc.font(DOC_FONT.body).fontSize(9).fillColor(b.secondary).text(dateStr, textRight - 110, top, { width: 110, align: 'right' });

  const ruleY = Math.max(textBottom, top + logoH, doc.y) + 8;
  doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(1.5).strokeColor(b.primary).stroke();
  doc.fillColor('black').strokeColor('black').lineWidth(1);
  doc.x = left;
  doc.y = ruleY + 24;
}
