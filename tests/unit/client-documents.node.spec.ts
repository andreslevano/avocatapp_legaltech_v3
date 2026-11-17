import { test, expect } from '@playwright/test';
import { clientDocuments, docsSummary, isSignatureDoc, signatureInfo } from '@/lib/clients/documents';

const d = (id: string, o: object = {}) => ({ id, caseId: null, clientId: null, ...o }) as Parameters<typeof signatureInfo>[0] & { id: string };

test('client documents: direct link or through one of their cases', () => {
  const docs = [d('a', { clientId: 'c1' }), d('b', { caseId: 'k1' }), d('c', { caseId: 'k9' }), d('e', { clientId: 'c2' })];
  expect(clientDocuments(docs, 'c1', ['k1']).map(x => x.id)).toEqual(['a', 'b']);
});

test('signature status: DocuSign, signed copies, handwritten, stored estado', () => {
  expect(signatureInfo(d('1', { signatureStatus: 'completed' }))).toMatchObject({ label: 'Firmado', tone: 'done', via: 'DocuSign' });
  expect(signatureInfo(d('2', { signatureStatus: 'sent' }))).toMatchObject({ tone: 'pending' });
  expect(signatureInfo(d('3', { signatureStatus: 'declined' }))).toMatchObject({ tone: 'problem' });
  expect(signatureInfo(d('4', { kind: 'signed' }))).toMatchObject({ label: 'PDF firmado' });
  expect(signatureInfo(d('5', { manualSignature: { sentAt: 'x' } }))).toMatchObject({ via: 'Firma manuscrita', tone: 'pending' });
  expect(signatureInfo(d('6', { manualSignedFrom: 'x' }))).toMatchObject({ label: 'Copia firmada por ti' });
  expect(signatureInfo(d('7', { status: 'Generado' }))).toBeNull();
  expect(isSignatureDoc(d('8', { status: 'Enviado' }))).toBe(true);
  expect(docsSummary([d('1', { signatureStatus: 'completed' }), d('2', { signatureStatus: 'sent' }), d('3')])).toEqual({ total: 3, signature: 2, signed: 1 });
});
