// The PDF Yousign signs (plan §5, option A). Yousign signs PDFs only, and the browser PDF is an image
// (html2canvas), so the signing PDF is rendered here with pdfkit: real text, the owner's branding
// header, the Avocat credit on every page — and the exact place of every "Firma:" / "Fecha:" line,
// so the signature (and date) fields are placed by coordinates, not by searching the text.
//
// Source: the same markdown DocuSign uses (withSignatureBlocks → one "Firma: ____" per signer, in
// order: block 1 = the owner, block k = the (k-1)th counterparty). Saved .doc files (no markdown) are
// converted back to that markdown subset by htmlToSigningMarkdown.
// Server-only (pdfkit, fonts).

import PDFDocument from '@/lib/pdf/pdfkit';
import { DOC_FONT } from '@/lib/pdf/fonts';
import { applyBrandingFonts, drawBrandedHeader } from '@/lib/pdf/branding';
import type { ServerBranding } from '@/lib/branding-server';
import { DOC_CREDIT } from '@/lib/doc-html';
import { primitives as P } from '@/lib/tokens';

// Document greys (the same family as the Word/PDF header and footer).
const INK = { header: P['neutral-700'], sub: P['neutral-600'], faint: P['neutral-400'], rule: P['neutral-800'], hr: P['neutral-300'] };

/** A field box in PDF points, origin top-left of the page (1-based page). */
export interface FieldBox { signer: number; kind: 'signature' | 'date'; page: number; x: number; y: number; width: number; height: number }
export interface SigningPdf { pdf: Buffer; fields: FieldBox[]; pages: number }

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { top: 72, bottom: 72, left: 72, right: 72 };
export const SIGNATURE_BOX = { width: 180, height: 52 };
export const DATE_BOX = { width: 120, height: 14 };

// Same labels doc-html recognises (SIG_BLOCK_RE / DATE_BLOCK_RE), on a line of their own.
const SIG_LINE_RE = /^\s*(?:\*\*)?(Firma y sello|Firma|Signature):(?:\*\*)?\s*_{4,}\s*$/;
const DATE_LINE_RE = /^\s*(?:\*\*)?(Fecha|Date):(?:\*\*)?\s*_{4,}\s*$/;

type Block =
  | { t: 'h1' | 'h2' | 'h3'; text: string }
  | { t: 'p'; lines: string[] }
  | { t: 'ul' | 'ol'; items: string[]; start: number }
  | { t: 'hr' };

/** The markdown subset Avocat documents use → blocks. Pure. */
export function parseBlocks(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: { t: 'ul' | 'ol'; items: string[]; start: number } | null = null;
  const flush = () => {
    if (para.length) out.push({ t: 'p', lines: para });
    if (list) out.push(list);
    para = []; list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { flush(); out.push({ t: (['h1', 'h2', 'h3'] as const)[h[1].length - 1], text: h[2].trim() }); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push({ t: 'hr' }); continue; }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      if (para.length) { out.push({ t: 'p', lines: para }); para = []; }
      const t = ul ? 'ul' : 'ol';
      if (!list || list.t !== t) { if (list) out.push(list); list = { t, items: [], start: ol ? Number(ol[1]) : 1 }; }
      list.items.push((ul ? ul[1] : ol![2]).trim());
      continue;
    }
    if (list) { out.push(list); list = null; }
    para.push(line.trim());
  }
  flush();
  return out;
}

/** "Texto **negrita** y *cursiva*" → runs. */
function runs(text: string): { text: string; bold: boolean; italic: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean).map(seg =>
    seg.startsWith('**') && seg.endsWith('**') ? { text: seg.slice(2, -2), bold: true, italic: false }
    : seg.startsWith('*') && seg.endsWith('*') && seg.length > 2 ? { text: seg.slice(1, -1), bold: false, italic: true }
    : { text: seg, bold: false, italic: false });
}

const plain = (s: string) => runs(s).map(r => r.text).join('');

/** Saved .doc HTML (buildDocHtml) → the markdown subset parseBlocks reads. Pure. */
export function htmlToSigningMarkdown(html: string): string {
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Header (divs/spans/table) and footer (div) carry no h/p/li tags: the block scan below skips them.
    .replace(/<img[^>]*>/gi, '________')                                        // stamped signature → line
    .replace(/<span[^>]*border-bottom[^>]*><\/span>/gi, ' ________')             // drawn signature / date lines
    .replace(/<span class="sig-date">[\s\S]*?<\/span>/gi, '________');
  const inline = (s: string) => s
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/[ \t]+/g, ' ').split('\n').map(l => l.trim()).join('\n').trim();
  const parts: string[] = [];
  const re = /<(h1|h2|h3|p|li|hr)\b[^>]*>([\s\S]*?)(?:<\/\1>|(?=<(?:h1|h2|h3|p|li|hr)\b))|<hr\s*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const tag = (m[1] ?? 'hr').toLowerCase();
    const text = inline(m[2] ?? '');
    if (tag === 'hr') parts.push('---');
    else if (!text) continue;
    else if (tag === 'li') parts.push(`- ${text}`);
    else if (tag === 'p') parts.push(text);
    else parts.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
  }
  return parts.join('\n\n');
}

export interface RenderOptions {
  title: string;
  authorName?: string;
  authorNif?: string;
  branding?: ServerBranding | null;
  language?: 'es' | 'en';
  date?: Date;
}

/** Renders the signing PDF and returns the field boxes (signer k = k-th "Firma:" line). */
export function renderSigningPdf(markdown: string, o: RenderOptions): Promise<SigningPdf> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: MARGIN, bufferPages: true, info: { Title: o.title, Producer: 'Avocat' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', reject);
    applyBrandingFonts(doc, o.branding);

    const left = MARGIN.left, width = A4.width - MARGIN.left - MARGIN.right;
    const bottom = () => A4.height - MARGIN.bottom;
    const fields: FieldBox[] = [];
    let sig = 0, date = 0;
    const page = () => doc.bufferedPageRange().start + doc.bufferedPageRange().count;   // 1-based current

    // Header: branded (logo, company, date, rule) or Avocat's plain one.
    if (o.branding && !o.branding.branding.isDefault) {
      drawBrandedHeader(doc, o.branding, o.date ?? new Date());
    } else {
      const dateStr = (o.date ?? new Date()).toLocaleDateString(o.language === 'en' ? 'en-GB' : 'es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.font(DOC_FONT.heading).fontSize(9).fillColor(INK.header)
        .text((o.authorName || 'AVOCAT LegalTech').toUpperCase(), left, MARGIN.top, { width: width - 140, characterSpacing: 0.5 });
      if (o.authorNif) doc.font(DOC_FONT.body).fontSize(8).fillColor(INK.sub).text(o.authorNif, left, doc.y, { width: width - 140 });
      const yAfter = doc.y;
      doc.font(DOC_FONT.body).fontSize(9).fillColor(INK.header).text(dateStr, left + width - 140, MARGIN.top, { width: 140, align: 'right' });
      const ruleY = Math.max(yAfter, doc.y) + 6;
      doc.moveTo(left, ruleY).lineTo(left + width, ruleY).lineWidth(0.75).strokeColor(INK.faint).stroke();
      doc.fillColor('black').strokeColor('black').lineWidth(1);
      doc.x = left; doc.y = ruleY + 22;
    }

    const ensure = (h: number) => { if (doc.y + h > bottom()) doc.addPage(); };
    const writeRuns = (text: string, opts: Record<string, unknown>, size = 12) => {
      const rs = runs(text);
      if (!rs.length) return;
      rs.forEach((r, i) => {
        doc.font(r.bold ? DOC_FONT.heading : r.italic ? DOC_FONT.italic : DOC_FONT.body).fontSize(size)
          .text(r.text, i === 0 ? { ...opts, continued: i < rs.length - 1 } : { continued: i < rs.length - 1 });
      });
    };

    /** "Firma: ____" / "Fecha: ____": label + rule, space above for the signature, field box recorded. */
    const signLine = (label: string, kind: 'signature' | 'date') => {
      const box = kind === 'signature' ? SIGNATURE_BOX : DATE_BOX;
      const above = kind === 'signature' ? box.height - 10 : 0;
      ensure(above + 20);
      doc.y += above;
      const y = doc.y;
      doc.font(DOC_FONT.body).fontSize(12).fillColor('black').text(`${label}:`, left, y, { lineBreak: false });
      const x = left + doc.widthOfString(`${label}:`) + 8;
      const lineY = y + 13;
      doc.moveTo(x, lineY).lineTo(x + box.width, lineY).lineWidth(0.5).strokeColor(INK.rule).stroke().strokeColor('black').lineWidth(1);
      const n = kind === 'signature' ? ++sig : ++date;
      fields.push({ signer: n, kind, page: page(), x: Math.round(x), y: Math.round(lineY - box.height), width: box.width, height: box.height });
      doc.x = left; doc.y = y + 18;
    };

    const blocks = parseBlocks(markdown);
    const sigBlockHeight = (x: Block | undefined) =>
      x && x.t === 'p' && x.lines.some(l => SIG_LINE_RE.test(l)) ? x.lines.length * 18 + SIGNATURE_BOX.height + 10 : 0;
    for (const [bi, b] of blocks.entries()) {
      // A heading followed by a signature block ("FIRMAS", "PARTE A") moves with it: never alone at a page end.
      if (b.t === 'h1' || b.t === 'h2' || b.t === 'h3') ensure(40 + sigBlockHeight(blocks[bi + 1]));
      if (b.t === 'h1') { ensure(60); doc.moveDown(0.5); writeRuns(plain(b.text).toUpperCase(), { align: 'center', width }, 14); doc.moveDown(1); }
      else if (b.t === 'h2') { ensure(50); doc.moveDown(0.6); doc.font(DOC_FONT.heading).fontSize(12).text(plain(b.text).toUpperCase(), left, doc.y, { width }); doc.moveDown(0.3); }
      else if (b.t === 'h3') { ensure(44); doc.moveDown(0.4); doc.font(DOC_FONT.heading).fontSize(12).text(plain(b.text), left, doc.y, { width }); doc.moveDown(0.2); }
      else if (b.t === 'hr') { ensure(20); const y = doc.y + 6; doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(INK.hr).stroke().strokeColor('black'); doc.y = y + 10; }
      else if (b.t === 'ul' || b.t === 'ol') {
        b.items.forEach((it, i) => {
          ensure(18);
          const bullet = b.t === 'ul' ? '•' : `${b.start + i}.`;
          const y = doc.y;
          doc.font(DOC_FONT.body).fontSize(12).text(bullet, left + 22, y, { width: 24 });
          doc.y = y;
          writeRuns(it, { x: left + 46, width: width - 46, align: 'justify' });
          doc.x = left;
        });
        doc.moveDown(0.4);
      } else if (b.t === 'p') {
        // A party's signature block (lines incl. "Firma: ____") is kept on one page.
        const isSigBlock = b.lines.some(l => SIG_LINE_RE.test(l));
        if (isSigBlock) ensure(b.lines.length * 18 + SIGNATURE_BOX.height + 10);
        for (const l of b.lines) {
          const s = SIG_LINE_RE.exec(l), d = DATE_LINE_RE.exec(l);
          if (s) signLine(s[1], 'signature');
          else if (d) signLine(d[1], 'date');
          else { ensure(16); writeRuns(l, { x: left, width, align: isSigBlock ? 'left' : 'justify' }); doc.x = left; }
        }
        doc.moveDown(0.6);
      }
    }

    // Avocat credit + page numbers on every page (as the browser PDF).
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0;            // writing in the margin must not open a new page
      const label = range.count > 1 ? `${DOC_CREDIT} · ${o.language === 'en' ? 'Page' : 'Página'} ${i + 1} ${o.language === 'en' ? 'of' : 'de'} ${range.count}` : DOC_CREDIT;
      doc.font(DOC_FONT.body).fontSize(8).fillColor(INK.faint)
        .text(label, left, A4.height - MARGIN.bottom + 28, { width, align: 'center', lineBreak: false });
    }
    doc.fillColor('black');
    const pages = range.count;
    doc.on('end', () => resolve({ pdf: Buffer.concat(chunks), fields, pages }));
    doc.end();
  });
}
