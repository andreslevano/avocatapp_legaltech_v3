// Yousign signing PDF (plan §5 option A): real text + exact field boxes per signer.
import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { withSignatureBlocks } from '@/lib/doc-html';
import { htmlToSigningMarkdown, parseBlocks, renderSigningPdf, SIGNATURE_BOX } from '@/lib/signatures/providers/yousign/pdf';
import { buildDocHtml } from '@/lib/doc-html';

async function pdfText(pdf: Buffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const d = await pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= d.numPages; i++) {
    const c = await (await d.getPage(i)).getTextContent();
    pages.push((c.items as { str?: string }[]).map(it => it.str ?? '').join(' '));
  }
  return pages;
}

const nda = renderMfwNda({ receptor: { tipo: 'persona', nombre: 'Juan Pérez', domicilio: 'Calle Mayor 1', documento: 'DNI 12345678Z', email: 'juan@x.es' }, productos: 'Plataforma Avocat' });

test('MOBIFORWORK NDA: text layer, two signature fields in order, on the signatures page', async () => {
  const r = await renderSigningPdf(nda, { title: 'NDA', authorName: 'MOBIFORWORK S.L.', authorNif: 'CIF ESB22430706' });
  expect(r.pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const sigs = r.fields.filter(f => f.kind === 'signature');
  expect(sigs.map(f => f.signer)).toEqual([1, 2]);
  // "Fecha: ____" of each party; the Anexo I lines have other labels and are not fields.
  expect(r.fields.filter(f => f.kind === 'date').map(f => f.signer)).toEqual([1, 2]);
  for (const f of sigs) {
    expect(f.page).toBeGreaterThanOrEqual(1);
    expect(f.page).toBeLessThanOrEqual(r.pages);
    expect(f.x).toBeGreaterThan(72);
    expect(f.y).toBeGreaterThan(72);
    expect(f.y + f.height).toBeLessThan(841.89 - 72);
    expect(f).toMatchObject({ width: SIGNATURE_BOX.width, height: SIGNATURE_BOX.height });
  }
  const text = (await pdfText(r.pdf)).join('\n');
  expect(text).toContain('ACUERDO DE CONFIDENCIALIDAD');
  expect(text).toContain('CLÁUSULA 14');
  expect(text).toContain('Juan Pérez');
  expect(text).toContain('AVOCAT powered by MobilityForWork');
  mkdirSync('screenshots', { recursive: true });
  writeFileSync('screenshots/yousign-signing.pdf', r.pdf);
  writeFileSync('screenshots/yousign-signing-fields.json', JSON.stringify(r.fields));
});

test('missing blocks are added for each signer (owner first)', async () => {
  const md = withSignatureBlocks('# Contrato\n\nTexto del contrato.', ['Ana Abogada', 'Juan Pérez', 'Lola Ruiz'], 'es');
  const r = await renderSigningPdf(md, { title: 'Contrato' });
  expect(r.fields.filter(f => f.kind === 'signature').map(f => f.signer)).toEqual([1, 2, 3]);
  const text = (await pdfText(r.pdf)).join('\n');
  expect(text).toContain('Ana Abogada');
  expect(text).toContain('FIRMAS');
});

test('long documents break pages and keep each signature block whole', async () => {
  const body = Array.from({ length: 80 }, (_, i) => `Párrafo ${i + 1}. ${'Lorem ipsum dolor sit amet. '.repeat(6)}`).join('\n\n');
  const md = withSignatureBlocks(`# Largo\n\n${body}`, ['A', 'B'], 'es');
  const r = await renderSigningPdf(md, { title: 'Largo' });
  expect(r.pages).toBeGreaterThan(3);
  const s = r.fields.filter(f => f.kind === 'signature');
  expect(s).toHaveLength(2);
  expect(s.every(f => f.page === r.pages || f.page === r.pages - 1)).toBe(true);
});

test('saved .doc HTML converts back to the same blocks', () => {
  const html = buildDocHtml('# Título\n\n## Sección\n\nTexto con **negrita**.\n\n- uno\n- dos\n\n**Ana**\nFecha: ____\nFirma: ________', 'X');
  const md = htmlToSigningMarkdown(html);
  const blocks = parseBlocks(md);
  expect(blocks[0]).toEqual({ t: 'h1', text: 'Título' });
  expect(blocks[1]).toEqual({ t: 'h2', text: 'Sección' });
  expect(md).toContain('**negrita**');
  expect(md).toMatch(/Firma: _{4,}/);
  expect(md).not.toContain('AVOCAT powered');
});
