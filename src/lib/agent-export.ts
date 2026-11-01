'use client';

import { buildDocHtml, type DocMeta } from './doc-html';

export type { DocMeta };

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
  // 794px = A4 at 96dpi; 96px ≈ 2.54cm matches @page margin:2.5cm for html2canvas
  Object.assign(container.style, {
    position: 'fixed', top: '-9999px', left: '-9999px',
    width: '794px', padding: '96px', background: 'white', zIndex: '-1',
    boxSizing: 'border-box',
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

// Save any markdown content as Word+PDF to Firebase Storage and return the document record
export async function saveAnalysisDocument(params: {
  content: string;
  title: string;
  userId: string;
  plan: string;
  caseId?: string | null;
}): Promise<import('@/lib/storage-client').DocumentRecord> {
  const { content, title, userId, plan, caseId } = params;
  const { blob: wordBlob, filename: wordFilename } = buildWordBlob(content, title);
  const { saveDocumentToStorage } = await import('@/lib/storage-client');
  let pdfBlob: Blob | undefined;
  try {
    const r = await buildPdfBlob(content, title);
    pdfBlob = r.blob;
  } catch { /* pdf generation optional */ }
  return saveDocumentToStorage({
    userId, plan, blob: wordBlob, name: wordFilename,
    caseId: caseId ?? null, source: 'generated',
    ...(pdfBlob ? { pdfBlob } : {}),
  });
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
