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

test('handwritten signature: waiting for the copy → Firmado once returned; returned copy labelled', async () => {
  const { awaitingSignedCopy } = await import('@/lib/clients/documents');
  const sent = d('o', { manualSignature: { sentAt: 'x', signedDocumentId: 's' } });
  expect(awaitingSignedCopy(sent)).toBe(true);
  expect(signatureInfo(sent)).toMatchObject({ label: 'Enviado para firma manuscrita', tone: 'pending' });
  const returned = d('o', { manualSignature: { sentAt: 'x', returnedDocumentId: 'r' }, status: 'Firmado' });
  expect(awaitingSignedCopy(returned)).toBe(false);
  expect(signatureInfo(returned)).toMatchObject({ label: 'Firmado', tone: 'done', via: 'Firma manuscrita' });
  expect(signatureInfo(d('r', { kind: 'signed', signedVia: 'manual' }))).toMatchObject({ label: 'Copia firmada por todos', via: 'Firma manuscrita' });
  expect(signatureInfo(d('k', { kind: 'signed' }))).toMatchObject({ via: 'DocuSign' });
});
