'use client';

function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function buildDocHtml(content: string, title: string): string {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `<!DOCTYPE html>
<html lang="es" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page WordSection1 { size: 21cm 29.7cm; margin: 2.5cm; }
    div.WordSection1 { page: WordSection1; }
    @page { size: A4; margin: 2.5cm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
    .doc-header {
      border-bottom: 1.5pt solid #000;
      padding-bottom: 10pt;
      margin-bottom: 20pt;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #444;
    }
    .doc-brand { font-weight: bold; letter-spacing: 1pt; text-transform: uppercase; }
    h1 { font-size: 16pt; font-weight: bold; margin: 0 0 12pt; }
    h2 { font-size: 13pt; font-weight: bold; margin: 18pt 0 6pt; }
    h3 { font-size: 11pt; font-weight: bold; margin: 14pt 0 4pt; }
    p  { margin: 0 0 8pt; text-align: justify; }
    li { margin: 2pt 0 2pt 16pt; }
    code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; padding: 1pt 3pt; }
    strong { font-weight: bold; }
    .doc-footer {
      border-top: 0.5pt solid #999;
      margin-top: 36pt;
      padding-top: 6pt;
      font-size: 8pt;
      color: #777;
      text-align: center;
    }
  </style>
</head>
<body>
<div class="WordSection1">
  <div class="doc-header">
    <span class="doc-brand">AVOCAT LegalTech</span>
    <span>${date}</span>
  </div>
  <h1>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  <p>${markdownToHtml(content)}</p>
  <div class="doc-footer">Generado por AVOCAT LegalTech · avocatapp.com · ${date}</div>
</div>
</body>
</html>`;
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s\-_]/g, '').trim().replace(/\s+/g, '_').slice(0, 80);
}

export function extractDocTitle(content: string): string {
  const h1 = content.match(/^# (.+)$/m);
  if (h1) return h1[1].trim();
  const bold = content.match(/^\*\*(.+?)\*\*/m);
  if (bold) return bold[1].trim();
  const first = content.split('\n').find(l => l.trim().length > 5);
  return first?.trim().slice(0, 60) ?? 'Documento legal';
}

export function downloadAsWord(content: string, title?: string) {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle);
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(docTitle)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsPdf(content: string, title?: string) {
  const docTitle = title ?? extractDocTitle(content);
  const html = buildDocHtml(content, docTitle);
  const autoprint = `<script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);};<\/script>`;
  const printHtml = html.replace('</head>', `${autoprint}</head>`);
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return;
  win.document.write(printHtml);
  win.document.close();
}
