// Document HTML builder (markdown → styled HTML used for Word, PDF and DocuSign).
// Pure string building — safe on both client and server (e.g. /api/signatures).

import { googleFontsHref, isHex6, isSafeLogoSrc, type ResolvedBranding } from './branding';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DocMeta {
  authorName?: string; // empresa or full name shown in page header
  authorNif?:  string; // e.g. "NIF B76786869" or "RUT 12.345.678-9"
}

// ── Block-based markdown → HTML converter ────────────────────────────────────
// Processes content line-by-line so headings are NEVER nested inside <p> tags.

function inline(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function processBlock(block: string): string {
  const lines = block.split('\n');
  const out: string[] = [];
  const listItems: string[] = [];
  const paraLines:  string[] = [];

  const flushList = () => {
    if (listItems.length) {
      out.push(`<ul>${listItems.map(i => `<li>${i}</li>`).join('')}</ul>`);
      listItems.length = 0;
    }
  };
  const flushPara = () => {
    if (paraLines.length) {
      const joined = paraLines.join('<br>');
      out.push(`<p>${joined}</p>`);
      paraLines.length = 0;
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;

    const h1m = t.match(/^# (.+)/);
    const h2m = t.match(/^## (.+)/);
    const h3m = t.match(/^### (.+)/);
    const lim = t.match(/^[-*] (.+)/);
    const hr  = /^-{3,}$|^\*{3,}$|^_{3,}$/.test(t);

    if (h1m)      { flushList(); flushPara(); out.push(`<h1>${inline(h1m[1])}</h1>`); }
    else if (h2m) { flushList(); flushPara(); out.push(`<h2>${inline(h2m[1])}</h2>`); }
    else if (h3m) { flushList(); flushPara(); out.push(`<h3>${inline(h3m[1])}</h3>`); }
    else if (hr)  { flushList(); flushPara(); out.push('<hr class="doc-sep">'); }
    else if (lim) { flushPara();  listItems.push(inline(lim[1])); }
    else          { flushList();  paraLines.push(inline(t)); }
  }
  flushList();
  flushPara();
  return out.join('');
}

function mdToHtml(md: string): string {
  return md.split(/\n\n+/).map(processBlock).filter(Boolean).join('\n');
}

// ── Signature injection ───────────────────────────────────────────────────────

const SIG_IMG = (url: string) =>
  `<img src="${url}" alt="Firma" style="height:52px;max-width:220px;vertical-align:middle;display:inline-block;margin-top:2px;" />`;

const SIG_LINE =
  `<span style="display:inline-block;width:200px;border-bottom:1pt solid #000;vertical-align:bottom;margin-left:4pt;"></span>`;

const DATE_LINE =
  `<span style="display:inline-block;width:120px;border-bottom:1pt solid #000;vertical-align:bottom;margin-left:4pt;"></span>`;

/**
 * "Fecha: ____" / "Firma: ____" → drawn lines. With the owner's signature (signatureUrl), the first
 * block gets the signature image AND today's date (`dates`, "es"/"en" by label); the other blocks keep
 * blank lines (each party dates it when signing). Bold labels ("**Fecha:** ____") are handled too.
 */
/** The date printed next to the owner's signature; the class lets saved documents be re-signed. */
const SIGNED_DATE = (text: string) => `<span class="sig-date">${text.replace(/[<>&"]/g, '')}</span>`;
/** Saved HTML → "Label: ____" again: stamped signature image, stamped date, drawn lines. */
const SIGNED_DATE_RE = /<span class="sig-date">[^<]*<\/span>/g;

function injectSignature(html: string, signatureUrl?: string, dates?: { es: string; en: string }): string {
  let date = 0;
  html = html.replace(DATE_BLOCK_RE, (_m, label: string, close?: string) => {
    const stampDate = signatureUrl && dates && ++date === 1;
    return stampDate ? `${label}:${close ?? ''} ${SIGNED_DATE(label === 'Date' ? dates!.en : dates!.es)}` : `${label}:${close ?? ''}${DATE_LINE}`;
  });
  let sig = 0;
  return html.replace(SIG_BLOCK_RE, (_m, label: string, close?: string) =>
    signatureUrl && ++sig === 1 ? `${label}:${close ?? ''} ${SIG_IMG(signatureUrl)}` : `${label}:${close ?? ''}${SIG_LINE}`);
}

// ── DocuSign anchors (forSignature mode) ────────────────────────────────────
// DocuSign places tabs by searching for anchor strings. Signature block n (1-based, in document
// order: Parte A / divulgante = 1, Parte B / receptora = 2, …) gets \sn\ (signHere) and
// \dn\ (dateSigned). The anchor text is white 1pt so it is invisible in the signed PDF.

export const signatureAnchor = (n: number) => `\\s${n}\\`;
export const dateAnchor = (n: number) => `\\d${n}\\`;

const ANCHOR = (text: string) => `<span style="color:#ffffff;font-size:1pt;">${text}</span>`;

// Labels may be bold in the model's output ("**Firma:** ____" → "<strong>Firma:</strong> ____").
// "Firma y sello:" is the label of the MOBIFORWORK validated template (org-templates).
const SIG_BLOCK_RE = /(Firma y sello|Firma|Signature):(\*\*|<\/strong>)?\s*_{4,}/g;
const DATE_BLOCK_RE = /(Fecha|Date):(\*\*|<\/strong>)?\s*_{4,}/g;

/** Number of signature lines ("Firma: ____") in the markdown — one per signing party. */
export function countSignatureBlocks(md: string): number {
  return (md.match(SIG_BLOCK_RE) ?? []).length;
}

function injectAnchors(html: string): string {
  let date = 0;
  let sig = 0;
  return html
    .replace(DATE_BLOCK_RE, (_m, label: string, close?: string) => `${label}:${close ?? ''} ${ANCHOR(dateAnchor(++date))}${DATE_LINE}`)
    // .ds-sig (after the label, so bold labels stay well-formed) makes the whole line taller:
    // DocuSign's adopted-signature frame is taller than one text line and overlapped the date.
    .replace(SIG_BLOCK_RE, (_m, label: string, close?: string) =>
      `${label}:${close ?? ''} <span class="ds-sig">${ANCHOR(signatureAnchor(++sig))}${SIG_LINE}</span>`);
}

// ── Documents without enough signature blocks (Phase 5a/5b) ─────────────────
// DocuSign needs one "Firma: ____" line per signer, in order: block 1 = owner, block k = the
// (k-1)th counterparty. Generated documents of any type — or older ones — may have fewer, so the
// missing blocks are appended at the end.

const LABELS = {
  es: { heading: 'FIRMAS', date: 'Fecha', sign: 'Firma' },
  en: { heading: 'SIGNATURES', date: 'Date', sign: 'Signature' },
};

/** Markdown for the blocks a document lacks, for `signers` = [owner, ...counterparties] ('' if none). */
export function missingSignatureBlocksMd(existing: number, signers: string[], lang: 'es' | 'en' = 'es'): string {
  if (existing >= signers.length) return '';
  const L = LABELS[lang] ?? LABELS.es;
  const clean = (n: string) => n.replace(/[*_#`<>]/g, '').trim() || '—';
  const blocks = signers.slice(existing)
    .map(n => `**${clean(n)}**\n${L.date}: ____________\n${L.sign}: ________________________`);
  return (existing === 0 ? `## ${L.heading}\n\n` : '') + blocks.join('\n\n');
}

export function withSignatureBlocks(md: string, signers: string[], lang: 'es' | 'en' = 'es'): string {
  const extra = missingSignatureBlocksMd(countSignatureBlocks(md), signers, lang);
  return extra ? `${md.trimEnd()}\n\n${extra}\n` : md;
}

const SIGNING_CSS = `
  .sig-section p { page-break-inside: avoid; break-inside: avoid; }
  .ds-sig { display: inline-block; margin-top: 16pt; }
`;

/**
 * DocuSign-ready HTML from a .doc Avocat saved earlier (it is buildDocHtml output, so no markdown
 * is needed). Returns null for files Avocat didn't build (uploads, other formats).
 */
export function signingHtmlFromSaved(saved: string, signers: string[], lang: 'es' | 'en' = 'es'): string | null {
  let html = saved.replace(/^﻿/, '');
  if (!html.includes('<div class="doc-footer">')) return null;
  // Back to the "Label: ____" form injectAnchors understands (stamped image / drawn lines).
  html = html
    .replace(/<img[^>]*alt="Firma"[^>]*>/g, '________')
    .replace(SIGNED_DATE_RE, '________')
    .replace(/<span style="display:inline-block;width:\d+px;border-bottom:[^"]*"><\/span>/g, ' ________');
  const existing = (html.match(SIG_BLOCK_RE) ?? []).length;
  const extra = missingSignatureBlocksMd(existing, signers, lang);
  if (extra) {
    const block = existing === 0 ? `<div class="sig-section">${mdToHtml(extra)}</div>` : mdToHtml(extra);
    html = html.replace('<div class="doc-footer">', `${block}\n<div class="doc-footer">`);
  }
  if (!html.includes('.ds-sig')) html = html.replace('</style>', `${SIGNING_CSS}</style>`);
  return injectAnchors(html);
}

// ── Manual signature ("Firma manuscrita") ────────────────────────────────────
// The owner's handwritten signature (Perfil → Firma manuscrita, a Storage image) is stamped in the
// FIRST signature block of a saved Avocat .doc and today's date in the first "Fecha:"; the other
// blocks keep their lines for the counterparties, who sign by hand. Blocks missing for the parties
// are appended, as for DocuSign.

const isStorageImage = (u: string) => /^https:\/\/(firebasestorage|storage)\.googleapis\.com\/[^\s"'<>]+$/.test(u);

export function stampOwnerSignature(
  saved: string, signatureUrl: string, dateText: string, signers: string[] = [], lang: 'es' | 'en' = 'es',
): string | null {
  if (!isStorageImage(signatureUrl)) return null;
  let html = saved.replace(/^\uFEFF/, '');
  if (!html.includes('<div class="doc-footer">')) return null;
  // Back to "Label: ____" (a signature stamped when the document was saved, drawn lines).
  html = html
    .replace(/<img[^>]*alt="Firma"[^>]*>/g, '________')
    .replace(SIGNED_DATE_RE, '________')
    .replace(/<span style="display:inline-block;width:\d+px;border-bottom:[^"]*"><\/span>/g, ' ________');
  const existing = (html.match(SIG_BLOCK_RE) ?? []).length;
  const extra = missingSignatureBlocksMd(existing, signers.length ? signers : ['—'], lang);
  if (extra) {
    const block = existing === 0 ? `<div class="sig-section">${mdToHtml(extra)}</div>` : mdToHtml(extra);
    html = html.replace('<div class="doc-footer">', `${block}\n<div class="doc-footer">`);
  }
  let date = 0;
  let sig = 0;
  return html
    .replace(DATE_BLOCK_RE, (_m, label: string, close?: string) => `${label}:${close ?? ''} ${++date === 1 ? SIGNED_DATE(dateText) : DATE_LINE}`)
    .replace(SIG_BLOCK_RE, (_m, label: string, close?: string) =>
      `${label}:${close ?? ''} ${++sig === 1 ? SIG_IMG(signatureUrl.replace(/"/g, '%22')) : SIG_LINE}`);
}

// ── HTML document template ────────────────────────────────────────────────────

function wrapSignatureSection(html: string): string {
  // Wrap content following a signature/firmas h2 in .sig-section so CSS can strip indent/justify
  const wrapped = html.replace(
    /(<h2>[^<]*(SIGNATURE BLOCK|SIGNATURES?|BLOQUE DE FIRMAS|FIRMAS? Y SELLOS|IX\.\s*FIRMAS?|VIII\.\s*FIRMAS?|FIRMAS?)\b[^<]*<\/h2>)/gi,
    '<div class="sig-section">$1',
  );
  // Close the wrapper just before the footer (always present in our template)
  return wrapped.replace(/(<div class="doc-footer">)/, '</div>$1');
}

export interface BuildDocOptions {
  /** DocuSign mode: no stamped signature image; anchors for signHere/dateSigned tabs instead. */
  forSignature?: boolean;
  /** Document branding (logo, header colours, font). Absent or default → legacy HTML, unchanged. */
  branding?: ResolvedBranding;
}

// ── Branding ─────────────────────────────────────────────────────────────────

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Extra CSS for a branded document. Colours are re-validated here: only #RRGGBB reaches the CSS. */
function brandingCss(b: ResolvedBranding): string {
  const primary = isHex6(b.primary) ? b.primary : '#444444';
  const secondary = isHex6(b.secondary) ? b.secondary : '#999999';
  const heading = b.headingColor && isHex6(b.headingColor) ? `\n  h1, h2, h3 { color: ${b.headingColor}; }` : '';
  // Font stacks come from FONT_CATALOG; strip anything that could close the declaration.
  const font = b.font.css.replace(/[;{}<>]/g, '');
  return `
  /* ── Branding ── */
  body, h1, h2, h3, p, li, td { font-family: ${font}; }${heading}
  table.doc-header-b {
    width: 100%;
    border-collapse: collapse;
    border-bottom: 1.5pt solid ${primary};
    margin-bottom: 24pt;
    font-size: 9pt;
  }
  table.doc-header-b td { padding: 0 0 8pt; vertical-align: middle; }
  td.doc-logo-cell { width: 1%; white-space: nowrap; }
  td.doc-logo-cell.left  { padding-right: 12pt; }
  td.doc-logo-cell.right { padding-left: 12pt; text-align: right; }
  /* max-width: none — host-page CSS (Tailwind preflight img{max-width:100%}) collapsed it inside the 1% cell */
  img.doc-logo { display: block; object-fit: contain; max-width: none; height: auto; }
  .doc-header-b .doc-author { color: ${primary}; font-weight: bold; letter-spacing: 0.5pt; text-transform: uppercase; display: block; }
  .doc-header-b .doc-nif    { color: ${secondary}; font-size: 8pt; display: block; }
  .doc-header-b .doc-date   { color: ${secondary}; text-align: right; white-space: nowrap; }
  .doc-footer { color: ${secondary}; }
`;
}

function brandedHeader(b: ResolvedBranding, authorName: string, authorNif: string, date: string): string {
  const logo = b.logo && isSafeLogoSrc(b.logo.src)
    ? `<img class="doc-logo" src="${escAttr(b.logo.src)}" alt="Logotipo" width="${Math.round(b.logo.width)}" height="${Math.round(b.logo.height)}" style="width:${Math.round(b.logo.width)}px;height:${Math.round(b.logo.height)}px;max-width:none;">`
    : '';
  const right = b.logo?.position === 'right';
  const logoCell = logo ? `<td class="doc-logo-cell ${right ? 'right' : 'left'}">${logo}</td>` : '';
  const text = `<td class="doc-header-text">
        <span class="doc-author">${inline(authorName)}</span>
        ${authorNif ? `<span class="doc-nif">${inline(authorNif)}</span>` : ''}
      </td>`;
  // Logo on the right sits after the date so name/NIF stay left and the logo marks the corner.
  const dateCell = `<td class="doc-date">${date}</td>`;
  return `<table class="doc-header-b" role="presentation"><tr>
      ${right ? `${text}${dateCell}${logoCell}` : `${logoCell}${text}${dateCell}`}
    </tr></table>`;
}

export function buildDocHtml(
  content: string, title: string, signatureUrl?: string, meta?: DocMeta, opts?: BuildDocOptions,
): string {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Header text: explicit meta wins, then the branding owner's header, then Avocat's.
  const authorName = meta?.authorName || opts?.branding?.header.authorName || 'AVOCAT LegalTech';
  const authorNif  = meta?.authorNif  || opts?.branding?.header.authorNif  || '';

  const body = mdToHtml(content);
  const bodyHtml = wrapSignatureSection(opts?.forSignature ? injectAnchors(body) : injectSignature(body, signatureUrl, { es: date, en: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) }));

  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = legacyHtml(safeTitle, authorName, authorNif, date, bodyHtml);
  const b = opts?.branding;
  if (!b || b.isDefault) return html;

  // Branded: same base document + override styles + table header (renders in Word, html2canvas, DocuSign).
  const fontHref = googleFontsHref(b.font);
  const head = `${fontHref ? `<link rel="stylesheet" href="${escAttr(fontHref)}">\n` : ''}<style>${brandingCss(b)}</style>\n</head>`;
  return html
    .replace('</head>', head)
    .replace(/  <div class="doc-header">[\s\S]*?\n  <\/div>\n/, `  ${brandedHeader(b, authorName, authorNif, date)}\n`);
}

function legacyHtml(safeTitle: string, authorName: string, authorNif: string, date: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>
  @page WordSection1 { size:21cm 29.7cm; margin:2.5cm; }
  div.WordSection1   { page:WordSection1; }
  @page {
    size: A4;
    margin: 2.5cm;
  }

  /* ── Base ── */
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }

  /* ── Page header ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1pt solid #999;
    padding-bottom: 8pt;
    margin-bottom: 24pt;
    font-size: 9pt;
    color: #444;
  }
  .doc-header-left { display: flex; flex-direction: column; gap: 1pt; }
  .doc-author { font-weight: bold; letter-spacing: 0.5pt; text-transform: uppercase; }
  .doc-nif    { font-size: 8pt; color: #666; }
  .doc-date   { text-align: right; white-space: nowrap; }

  /* ── Headings ── */
  h1 {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    text-indent: 0;
    margin: 0 0 24pt;
    letter-spacing: 0.5pt;
  }
  h2 {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    text-align: left;
    text-indent: 0;
    margin: 18pt 0 6pt;
  }
  h3 {
    font-size: 12pt;
    font-weight: bold;
    text-align: left;
    text-indent: 0;
    margin: 14pt 0 4pt;
  }

  /* ── Body text ── */
  p {
    margin: 0 0 6pt;
    text-align: justify;
    text-indent: 1cm;
  }

  /* ── Lists ── */
  ul, ol {
    margin: 0 0 6pt;
    padding-left: 1.5cm;
    text-align: justify;
  }
  li { margin: 2pt 0; }

  /* ── Separators ── */
  hr.doc-sep {
    border: none;
    border-top: 0.5pt solid #ccc;
    margin: 10pt 0;
  }

  /* ── Inline ── */
  strong { font-weight: bold; }
  em     { font-style: italic; }
  code   { font-family: 'Courier New', monospace; font-size: 10pt; }

  /* ── Signature section — left-aligned, no indent ── */
  .sig-section p, .sig-section li {
    text-indent: 0;
    text-align: left;
    word-spacing: normal;
  }
  /* One party's block (name … Firma) never splits across pages */
  .sig-section p { page-break-inside: avoid; break-inside: avoid; }
  .ds-sig { display: inline-block; margin-top: 16pt; }

  /* ── Footer ── */
  .doc-footer {
    border-top: 0.5pt solid #ccc;
    margin-top: 36pt;
    padding-top: 6pt;
    font-size: 8pt;
    color: #999;
    text-align: center;
  }
</style>
</head>
<body>
<div class="WordSection1">

  <div class="doc-header">
    <div class="doc-header-left">
      <span class="doc-author">${inline(authorName)}</span>
      ${authorNif ? `<span class="doc-nif">${inline(authorNif)}</span>` : ''}
    </div>
    <span class="doc-date">${date}</span>
  </div>

  ${bodyHtml}

  <div class="doc-footer">Documento generado con AVOCAT &middot; avocatapp.com</div>

</div>
</body>
</html>`;
}
