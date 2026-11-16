// Date next to the owner's stamped signature (generated documents).
import { test, expect } from '@playwright/test';
import { buildDocHtml, dateAnchor, signatureAnchor, signingHtmlFromSaved, stampOwnerSignature } from '@/lib/doc-html';

const SIG = 'https://firebasestorage.googleapis.com/v0/b/x/o/sig.png';
const TODAY = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
const TODAY_EN = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
const two = (label = 'Fecha', sign = 'Firma', bold = false) => {
  const l = (x: string) => (bold ? `**${x}:**` : `${x}:`);
  return `# Doc\n\nTexto.\n\n## FIRMAS\n\n**A**\n${l(label)} ____________\n${l(sign)} ________________________\n\n**B**\n${l(label)} ____________\n${l(sign)} ________________________\n`;
};
const dates = (h: string) => (h.match(/class="sig-date">[^<]*</g) ?? []).map(s => s.slice(17, -1));

test('owner signature stamped → today in the first block only', () => {
  const html = buildDocHtml(two(), 'NDA', SIG);
  expect(dates(html)).toEqual([TODAY]);
  expect(html.indexOf(TODAY, html.indexOf('FIRMAS'))).toBeLessThan(html.indexOf('<strong>B</strong>'));
  expect(html.match(/alt="Firma"/g)).toHaveLength(1);
});

test('no stamped signature → no date (each party dates it when signing)', () => {
  const html = buildDocHtml(two(), 'Contrato');
  expect(dates(html)).toEqual([]);
  expect(html).not.toContain('____');
});

test('bold labels ("**Fecha:** ____") are drawn too; English "Date"', () => {
  const bold = buildDocHtml(two('Fecha', 'Firma', true), 'NDA', SIG);
  expect(bold).not.toContain('____');
  expect(dates(bold)).toEqual([TODAY]);
  const en = buildDocHtml(two('Date', 'Signature'), 'NDA', SIG);
  expect(dates(en)).toEqual([TODAY_EN]);
});

test('a saved document with the stamped date re-signs correctly (DocuSign anchors, manual)', () => {
  const saved = buildDocHtml(two(), 'NDA', SIG);
  const ds = signingHtmlFromSaved(saved, ['A', 'B'])!;
  expect(ds.match(/\\[sd]\d\\/g)).toEqual([dateAnchor(1), signatureAnchor(1), dateAnchor(2), signatureAnchor(2)]);
  expect(ds).not.toContain('sig-date');
  const manual = stampOwnerSignature(saved, SIG, 'mañana', ['A', 'B'])!;
  expect(dates(manual)).toEqual(['mañana']);
  expect(manual.indexOf('mañana')).toBeLessThan(manual.indexOf('<strong>B</strong>'));
});
