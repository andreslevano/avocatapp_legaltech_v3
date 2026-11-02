import { test, expect } from '@playwright/test';
import { buildDocHtml, countSignatureBlocks, missingSignatureBlocksMd, signingHtmlFromSaved, withSignatureBlocks } from '@/lib/doc-html';
import { canSendForSignature, signatureTitleFromName } from '@/lib/signatures/eligibility';
import { validateSignatureInput, DEFAULT_SIGNATURE_OPTIONS } from '@/lib/signatures/types';

const names = ['Ana Ruiz', 'Juan Gil'];
const body = '# CONTRATO\n\n' + 'Cláusula de prueba con texto suficiente. '.repeat(10);
const twoBlocks = `${body}\n\n## FIRMAS\n\n**A**\nFecha: ____\nFirma: ________\n\n**B**\nFecha: ____\nFirma: ________`;

test.describe('signature blocks fallback (5a)', () => {
  test('appends both blocks with a heading when there are none', () => {
    const md = withSignatureBlocks(body, names);
    expect(countSignatureBlocks(md)).toBe(2);
    expect(md).toContain('## FIRMAS\n\n**Ana Ruiz**');
    expect(md.indexOf('Ana Ruiz')).toBeLessThan(md.indexOf('Juan Gil'));          // owner = block 1
  });
  test('adds only the counterparty when one block exists', () => {
    const extra = missingSignatureBlocksMd(1, names);
    expect(extra).not.toContain('##');
    expect(extra).toContain('Juan Gil');
    expect(extra).not.toContain('Ana Ruiz');
  });
  test('leaves complete documents untouched; English labels', () => {
    expect(withSignatureBlocks(twoBlocks, names)).toBe(twoBlocks);
    expect(missingSignatureBlocksMd(0, names, 'en')).toContain('## SIGNATURES');
    expect(missingSignatureBlocksMd(0, ['**x**', ''])).toContain('**x**\n');
  });
});

test.describe('signing HTML from a saved .doc (5a)', () => {
  const anchors = (h: string) => ({ s: (h.match(/\\s\d\\/g) ?? []).length, d: (h.match(/\\d\d\\/g) ?? []).length });

  test('drawn lines become DocuSign anchors', () => {
    const html = signingHtmlFromSaved('﻿' + buildDocHtml(twoBlocks, 'Contrato'), names)!;
    expect(anchors(html)).toEqual({ s: 2, d: 2 });
    expect(html).toContain('\\s1\\');
    expect(html).toContain('\\s2\\');
  });
  test('stamped signature image (NDA with saved firma) is replaced by an anchor', () => {
    const saved = buildDocHtml(twoBlocks, 'NDA', 'https://x/firma.png');
    expect(saved).toContain('alt="Firma"');
    const html = signingHtmlFromSaved(saved, names)!;
    expect(html).not.toContain('alt="Firma"');
    expect(anchors(html).s).toBe(2);
  });
  test('bold labels keep working', () => {
    const md = twoBlocks.replace(/Firma:/g, '**Firma:**').replace(/Fecha:/g, '**Fecha:**');
    expect(anchors(signingHtmlFromSaved(buildDocHtml(md, 'X'), names)!).s).toBe(2);
  });
  test('documents without blocks get them before the footer', () => {
    const html = signingHtmlFromSaved(buildDocHtml(body, 'Escrito'), names)!;
    expect(anchors(html)).toEqual({ s: 2, d: 2 });
    expect(html.indexOf('Juan Gil')).toBeLessThan(html.indexOf('<div class="doc-footer">'));
    expect(html).toContain('.ds-sig');
  });
  test('files Avocat did not build are refused', () => {
    expect(signingHtmlFromSaved('%PDF-1.7 …', names)).toBeNull();
    expect(signingHtmlFromSaved('<html><body>Firma: ____</body></html>', names)).toBeNull();
  });
});

test.describe('eligibility (5a)', () => {
  test('only generated Word documents, not in signature, not signed', () => {
    expect(canSendForSignature({ type: 'doc', source: 'generated' })).toBe(true);
    expect(canSendForSignature({ type: 'doc' })).toBe(true);
    expect(canSendForSignature({ type: 'pdf', source: 'generated' })).toBe(false);
    expect(canSendForSignature({ type: 'doc', source: 'uploaded' })).toBe(false);
    expect(canSendForSignature({ type: 'doc', source: 'microsoft' })).toBe(false);
    expect(canSendForSignature({ type: 'pdf', source: 'docusign', kind: 'signed' })).toBe(false);
    expect(canSendForSignature({ type: 'doc', signatureStatus: 'sent' })).toBe(false);
    expect(canSendForSignature({ type: 'doc', signatureStatus: 'completed' })).toBe(false);
    expect(canSendForSignature({ type: 'doc', signatureStatus: 'declined' })).toBe(true);
    expect(canSendForSignature({ type: 'doc', signatureStatus: 'voided' })).toBe(true);
  });
  test('title from the file name', () => {
    expect(signatureTitleFromName('NDA_MFW_MDC.doc')).toBe('NDA MFW MDC');
    expect(signatureTitleFromName('1746000000_Contrato.doc')).toBe('Contrato');
  });
  test('markdown is optional in the request body', () => {
    const base = { documentId: 'd1', title: 'X', signers: [{ name: 'J', email: 'j@x.com' }], subject: 'S', message: '', options: DEFAULT_SIGNATURE_OPTIONS };
    expect(validateSignatureInput(base)).toBeNull();
    expect(validateSignatureInput({ ...base, markdown: 'short' })).toBe('El documento está vacío.');
  });
});
