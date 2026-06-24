'use client';

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

function injectSignature(html: string, signatureUrl?: string): string {
  // Replace date placeholders with styled lines
  html = html
    .replace(/Fecha:\s*_{4,}/g, `Fecha:${DATE_LINE}`)
    .replace(/Date:\s*_{4,}/g,  `Date:${DATE_LINE}`);

  if (signatureUrl) {
    // First signature block (divulgante/disclosing) → image; rest → blank line
    let first = true;
    html = html.replace(/(?:Firma|Signature):\s*_{4,}/g, (match) => {
      const label = match.startsWith('Firma') ? 'Firma' : 'Signature';
      if (first) { first = false; return `${label}: ${SIG_IMG(signatureUrl)}`; }
      return `${label}:${SIG_LINE}`;
    });
  } else {
    html = html
      .replace(/Firma:\s*_{4,}/g,     `Firma:${SIG_LINE}`)
      .replace(/Signature:\s*_{4,}/g, `Signature:${SIG_LINE}`);
  }
  return html;
}

// ── HTML document template ────────────────────────────────────────────────────

function buildDocHtml(content: string, title: string, signatureUrl?: string, meta?: DocMeta): string {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const authorName = meta?.authorName || 'AVOCAT LegalTech';
  const authorNif  = meta?.authorNif  || '';

  const bodyHtml = injectSignature(mdToHtml(content), signatureUrl);

  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

// ── Public utilities ──────────────────────────────────────────────────────────

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s\-_]/g, '').trim().replace(/\s+/g, '_').slice(0, 80);
}

export function isLegalDocument(content: string): boolean {
  if (content.length < 400) return false;
  if (/^#{1,3}\s.+/m.test(content)) return true;
  if ((content.match(/\*\*[^*]{5,60}\*\*/g) ?? []).length >= 3) return true;
  if (/^(PRIMERO|SEGUNDO|TERCERO|HECHOS|FUNDAMENTOS|PETICIÓN|SUPLICO|ANTECEDENTES|OBJETO|CONSIDERANDO|AL JUZGADO|AL TRIBUNAL|DEMANDA|CONTRATO|ACUERDO|CARTA)\b/m.test(content)) return true;
  if ((content.match(/^[A-ZÁÉÍÓÚÜÑ\s]{8,50}$/gm) ?? []).length >= 2) return true;
  return false;
}

export function extractDocTitle(content: string): string {
  const h1 = content.match(/^# (.+)$/m);
  if (h1) return h1[1].trim();
  const bold = content.match(/^\*\*(.+?)\*\*/m);
  if (bold) return bold[1].trim();
  const first = content.split('\n').find(l => l.trim().length > 5);
  return first?.trim().slice(0, 60) ?? 'Documento legal';
}

export async function buildPdfBlob(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta
): Promise<{ blob: Blob; filename: string }> {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle, signatureUrl, meta);

  const container = document.createElement('div');
  container.innerHTML = html;
  Object.assign(container.style, {
    position: 'fixed', top: '-9999px', left: '-9999px',
    width: '794px', background: 'white', zIndex: '-1',
  });
  document.body.appendChild(container);

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.88);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height / canvas.width) * imgW;

    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    let consumed = pageH;
    while (consumed < imgH) {
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -consumed, imgW, imgH);
      consumed += pageH;
    }
    return { blob: pdf.output('blob'), filename: `${sanitizeFilename(docTitle)}.pdf` };
  } finally {
    document.body.removeChild(container);
  }
}

export function buildWordBlob(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta
): { blob: Blob; filename: string } {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle, signatureUrl, meta);
  const blob = new Blob(['﻿' + html], { type: 'application/msword' });
  return { blob, filename: `${sanitizeFilename(docTitle)}.doc` };
}

export function downloadAsWord(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta
) {
  const { blob, filename } = buildWordBlob(content, title, signatureUrl, meta);
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function downloadAsPdf(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta
) {
  const docTitle = title ?? extractDocTitle(content);
  const html     = buildDocHtml(content, docTitle, signatureUrl, meta);
  const autoprint = `<script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);};<\/script>`;
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return;
  win.document.write(html.replace('</head>', `${autoprint}</head>`));
  win.document.close();
}
