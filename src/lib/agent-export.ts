'use client';

import { buildDocHtml, DOC_CREDIT, DRAFT_MARK, type DocMeta } from './doc-html';
import { primaryFamily, type ResolvedBranding } from './branding';
import { A4_PX, PDF_MARGIN_MM, PX_PER_MM, pageStarts, type Zone } from '@/lib/pdf-pages';
import { primitives } from '@/lib/tokens';

export type { DocMeta, ResolvedBranding };

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
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta, branding?: ResolvedBranding,
  opts?: { draft?: boolean },
): Promise<{ blob: Blob; filename: string }> {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle, signatureUrl, meta, { branding, draft: opts?.draft });
  return buildPdfBlobFromHtml(html, docTitle, branding);
}

/** PDF of an already-built document HTML (e.g. a saved .doc with the owner's signature stamped). */
export async function buildPdfBlobFromHtml(
  html: string, docTitle: string, branding?: ResolvedBranding,
): Promise<{ blob: Blob; filename: string }> {
  // Rendered in its own document (a hidden iframe): the app's CSS — dark theme text colour, the gold
  // h1/h2 of globals.css, Tailwind preflight — must not leak into the document. 794px = A4 width at
  // 96dpi; side padding 2.54cm; top/bottom margins are added per PDF page.
  // NDA negotiation draft (buildDocHtml draft): diagonal watermark + top line on every page.
  const draft = html.includes('class="doc-draft"');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed', top: '0', left: '-10000px', width: `${A4_PX.width}px`, height: `${A4_PX.height}px`,
    border: '0', zIndex: '-1',
  });
  document.body.appendChild(frame);
  const idoc = frame.contentDocument!;
  const paper = primitives['neutral-0'];
  idoc.open();
  idoc.write(html.replace('</head>',
    `<style>html,body{margin:0;background:${paper}}body{width:${A4_PX.width}px;padding:0 96px;box-sizing:border-box}</style></head>`));
  idoc.close();
  const container = idoc.body;

  try {
    if (idoc.readyState !== 'complete') {
      await new Promise(r => { frame.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
    }
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // The document's web font (branding) must be loaded in BOTH documents: the frame lays the text out,
    // but html2canvas draws it on a canvas of this page — a font missing here = wrong glyph spacing.
    const href = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
    const fam = branding?.font.google ? primaryFamily(branding.font)
      : href ? decodeURIComponent(href.match(/family=([^:&]+)/)?.[1] ?? '').replace(/\+/g, ' ') : '';
    if (href && !document.querySelector(`link[data-doc-font][href="${href}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.dataset.docFont = '';
      document.head.appendChild(l);
    }
    const docs = [idoc, document].map(d => (d as Document & { fonts?: FontFaceSet }).fonts).filter((f): f is FontFaceSet => !!f);
    if (fam) {
      await Promise.race([
        Promise.all(docs.flatMap(f => ['400 12pt', '700 12pt', 'italic 400 12pt'].map(w => f.load(`${w} "${fam}"`)))),
        new Promise(r => setTimeout(r, 6000)),
      ]).catch(() => undefined);
    }
    await Promise.all(docs.map(f => f.ready));
    // Wait for the logo (and any other image) so html2canvas never captures an empty box.
    await Promise.all(Array.from(container.querySelectorAll('img')).map(img => img.complete ? null
      : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 4000); })));
    // What must stay together (DOM): a heading with the next line, a signature block, an image.
    const origin = container.getBoundingClientRect().top;
    const zones: Zone[] = [];
    container.querySelectorAll('img, table, .sig-section p').forEach(el => {
      const r = el.getBoundingClientRect();
      zones.push({ top: r.top - origin, bottom: r.bottom - origin });
    });
    container.querySelectorAll('h1, h2, h3').forEach(el => {
      const r = el.getBoundingClientRect();
      const next = el.nextElementSibling?.getBoundingClientRect();
      // heading + roughly its first following line
      zones.push({ top: r.top - origin, bottom: next ? Math.min(next.bottom, next.top + 28) - origin : r.bottom - origin });
    });

    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, backgroundColor: paper, logging: false,
      windowWidth: A4_PX.width, windowHeight: container.scrollHeight,
    });
    const ratio = canvas.width / container.offsetWidth;          // canvas px per CSS px
    const totalCss = canvas.height / ratio;
    const contentCss = A4_PX.height - (PDF_MARGIN_MM.top + PDF_MARGIN_MM.bottom) * PX_PER_MM;
    // Cut only where the rendered image is blank across the text column (between lines), so a page
    // never slices through text whatever the DOM-vs-canvas layout drift.
    const starts = pageStarts(blankRows(canvas, 96 * ratio, (A4_PX.width - 96) * ratio, ratio), zones, totalCss, contentCss);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const mmPerCss = pageW / A4_PX.width;
    starts.forEach((startCss, i) => {
      const endCss = starts[i + 1] ?? totalCss;
      const sliceH = Math.max(1, Math.round((endCss - startCss) * ratio));
      const page = document.createElement('canvas');
      page.width = canvas.width;
      page.height = sliceH;
      const ctx = page.getContext('2d')!;
      ctx.fillStyle = primitives['neutral-0'];
      ctx.fillRect(0, 0, page.width, page.height);
      ctx.drawImage(canvas, 0, Math.round(startCss * ratio), canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (i > 0) pdf.addPage();
      pdf.addImage(page.toDataURL('image/jpeg', 0.88), 'JPEG', 0, PDF_MARGIN_MM.top, pageW, (endCss - startCss) * mmPerCss);
      // Every page: the Avocat credit (and the page number when there are several).
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      const pageNo = starts.length > 1 ? ` · Página ${i + 1} de ${starts.length}` : '';
      pdf.text(`${DOC_CREDIT}${pageNo}`, pageW / 2, pageH - 10, { align: 'center' });
      if (draft) drawDraftMark(pdf, pageW, pageH);
    });
    return { blob: pdf.output('blob'), filename: `${sanitizeFilename(docTitle)}.pdf` };
  } finally {
    document.body.removeChild(frame);
  }
}

/** "BORRADOR — NO FIRMAR": top line and a light diagonal watermark (drawn over the page image). */
function drawDraftMark(pdf: import('jspdf').jsPDF, pageW: number, pageH: number) {
  const red: [number, number, number] = [180, 35, 24];
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...red);
  pdf.text(DRAFT_MARK, pageW / 2, 8, { align: 'center' });
  pdf.saveGraphicsState();
  pdf.setGState(pdf.GState({ opacity: 0.12 }));
  pdf.setFontSize(54);
  const w = pdf.getTextWidth(DRAFT_MARK);
  const a = Math.PI / 4;
  // Rotated 45° about its start point: start so the text's middle sits on the page centre.
  pdf.text(DRAFT_MARK, pageW / 2 - (w / 2) * Math.cos(a), pageH / 2 + (w / 2) * Math.sin(a), { angle: 45 });
  pdf.restoreGraphicsState();
  pdf.setFont('helvetica', 'normal');
}

/** y (CSS px) of every image row that is white across [x0, x1) — safe places to cut a page. */
function blankRows(canvas: HTMLCanvasElement, x0: number, x1: number, ratio: number): number[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const out: number[] = [];
  const left = Math.max(0, Math.floor(x0)), width = Math.min(canvas.width, Math.ceil(x1)) - left;
  const BAND = 1500;
  for (let y0 = 0; y0 < canvas.height; y0 += BAND) {
    const h = Math.min(BAND, canvas.height - y0);
    const data = ctx.getImageData(left, y0, width, h).data;
    for (let row = 0; row < h; row++) {
      let blank = true;
      const base = row * width * 4;
      for (let x = 0; x < width; x += 2) {
        const i = base + x * 4;
        if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) { blank = false; break; }
      }
      if (blank) out.push((y0 + row) / ratio);
    }
  }
  return out;
}

export function buildWordBlob(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta, branding?: ResolvedBranding,
  opts?: { draft?: boolean },
): { blob: Blob; filename: string } {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle, signatureUrl, meta, { branding, draft: opts?.draft });
  const blob = new Blob(['﻿' + html], { type: 'application/msword' });
  return { blob, filename: `${sanitizeFilename(docTitle)}.doc` };
}

export function downloadAsWord(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta, branding?: ResolvedBranding
) {
  const { blob, filename } = buildWordBlob(content, title, signatureUrl, meta, branding);
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Save any markdown content as Word+PDF to Firebase Storage and return the document record
export async function saveAnalysisDocument(params: {
  content: string;
  title: string;
  userId: string;
  plan: string;
  caseId?: string | null;
  /** Word branding (logo as Storage URL); pdfBranding defaults to it (logo as data URI is best). */
  branding?: ResolvedBranding;
  pdfBranding?: ResolvedBranding;
}): Promise<import('@/lib/storage-client').DocumentRecord> {
  const { content, title, userId, plan, caseId, branding, pdfBranding } = params;
  const { blob: wordBlob, filename: wordFilename } = buildWordBlob(content, title, undefined, undefined, branding);
  const { saveDocumentToStorage } = await import('@/lib/storage-client');
  let pdfBlob: Blob | undefined;
  try {
    const r = await buildPdfBlob(content, title, undefined, undefined, pdfBranding ?? branding);
    pdfBlob = r.blob;
  } catch { /* pdf generation optional */ }
  return saveDocumentToStorage({
    userId, plan, blob: wordBlob, name: wordFilename,
    caseId: caseId ?? null, source: 'generated',
    ...(pdfBlob ? { pdfBlob } : {}),
  });
}

export function downloadAsPdf(
  content: string, title?: string, signatureUrl?: string, meta?: DocMeta, branding?: ResolvedBranding
) {
  const docTitle = title ?? extractDocTitle(content);
  const html     = buildDocHtml(content, docTitle, signatureUrl, meta, { branding });
  const autoprint = `<script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);};<\/script>`;
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return;
  win.document.write(html.replace('</head>', `${autoprint}</head>`));
  win.document.close();
}
