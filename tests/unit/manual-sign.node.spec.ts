// "Firma manuscrita": stamping the owner's signature, validation and the email.
import { test, expect } from '@playwright/test';
import { buildDocHtml, stampOwnerSignature } from '@/lib/doc-html';
import { manualSignedEmail, parseManualSend } from '@/lib/signatures/manual';

const SIG = 'https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fu%2Ffirma%2Fsignature.png?alt=media&token=t';
const MD = `# NDA

Texto.

## FIRMAS

**ACME S.L.**
Fecha: ____________
Firma: ________________________

**Juan Pérez**
Fecha: ____________
Firma: ________________________
`;

test('stamps the owner signature + date in the first block only; others keep lines', () => {
  const html = stampOwnerSignature(buildDocHtml(MD, 'NDA'), SIG, '16 de noviembre de 2026', ['Ana', 'Juan'])!;
  expect(html.match(/<img[^>]*alt="Firma"/g)).toHaveLength(1);
  expect(html).toContain('16 de noviembre de 2026');
  expect(html.indexOf('alt="Firma"')).toBeLessThan(html.indexOf('Juan Pérez'));
  expect((html.match(/border-bottom:1pt solid #000/g) ?? []).length).toBeGreaterThanOrEqual(2);   // B's date + signature lines
});

test('replaces a signature stamped at save time instead of adding a second one', () => {
  const saved = buildDocHtml(MD, 'NDA', 'https://firebasestorage.googleapis.com/v0/b/x/o/old.png');
  const html = stampOwnerSignature(saved, SIG, 'hoy', ['Ana', 'Juan'])!;
  expect(html.match(/<img[^>]*alt="Firma"/g)).toHaveLength(1);
  expect(html).not.toContain('old.png');
});

test('appends blocks when the document has none; rejects foreign files and unsafe urls', () => {
  const html = stampOwnerSignature(buildDocHtml('# Carta\n\nHola.', 'Carta'), SIG, 'hoy', ['Ana', 'Juan', 'Eva'])!;
  expect(html).toContain('FIRMAS');
  expect(html.match(/<img[^>]*alt="Firma"/g)).toHaveLength(1);
  expect(html).toContain('Eva');
  expect(stampOwnerSignature('<html>no avocat</html>', SIG, 'hoy')).toBeNull();
  expect(stampOwnerSignature(buildDocHtml(MD, 'NDA'), 'javascript:alert(1)', 'hoy')).toBeNull();
  expect(stampOwnerSignature(buildDocHtml(MD, 'NDA'), 'https://evil.com/x.png', 'hoy')).toBeNull();
});

test('parseManualSend validation', () => {
  const ok = parseManualSend({ documentId: 'd1', signedDocumentId: 'd2', recipients: [{ name: 'Juan', email: 'Juan@X.es' }], cc: [], subject: 'S', message: 'M' }, 'ana@x.es');
  expect(ok).toEqual({ ok: true, input: { documentId: 'd1', signedDocumentId: 'd2', recipients: [{ name: 'Juan', email: 'juan@x.es' }], cc: [], subject: 'S', message: 'M' } });
  const bad = (b: object) => parseManualSend({ documentId: 'd1', signedDocumentId: 'd2', recipients: [{ name: 'J', email: 'j@x.es' }], ...b }, 'ana@x.es');
  expect(bad({ recipients: [] })).toMatchObject({ ok: false });
  expect(bad({ recipients: [{ name: 'J', email: 'j@' }] })).toMatchObject({ ok: false });
  expect(bad({ cc: [{ name: 'J', email: 'j@x.es' }] })).toMatchObject({ ok: false, error: expect.stringContaining('distinto') });
  expect(bad({ recipients: [{ name: 'Yo', email: 'ana@x.es' }] })).toMatchObject({ ok: false });
  expect(bad({ documentId: '../x' })).toMatchObject({ ok: false });
  expect(bad({ recipients: Array.from({ length: 11 }, (_, i) => ({ name: 'x', email: `x${i}@x.es` })) })).toMatchObject({ ok: false });
});

test('email escapes user text and explains how to sign', () => {
  const m = manualSignedEmail({ ownerName: 'Ana <b>', title: 'NDA "x"', subject: '', message: 'Hola <script>', recipientName: 'Juan' });
  expect(m.subject).toBe('Ana <b> te envía «NDA "x"» firmado');
  expect(m.html).not.toContain('<script>');
  expect(m.html).toContain('Ana &lt;b&gt;');
  expect(m.text).toContain('fírmalo a mano');
});
