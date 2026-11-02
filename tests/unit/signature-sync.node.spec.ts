import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { deriveSync, refreshAvailableAt, REFRESH_WINDOW_MS, summaryFromConnect } from '@/lib/signatures/sync';
import type { SignatureRecipient, SignatureRequest } from '@/lib/signatures/types';
import { buildDocHtml } from '@/lib/doc-html';
import { firebaseDownloadUrl, signedFileName, signedStoragePath } from '@/lib/signatures/filing';
import { stampedFileName } from '@/lib/file-stamp';
import { signatureTitleFromName } from '@/lib/signatures/eligibility';

const NOW = '2026-11-02T10:00:00.000Z';
const owner = (status: SignatureRecipient['status']): SignatureRecipient =>
  ({ role: 'owner', name: 'Ana', email: 'ana@bufete.es', routingOrder: 1, status });
const other = (status: SignatureRecipient['status']): SignatureRecipient =>
  ({ role: 'signer', name: 'Juan', email: 'juan@nike.com', routingOrder: 2, status });
const req = (status: SignatureRequest['status'], o: SignatureRecipient['status'], c: SignatureRecipient['status']) =>
  ({ status, recipients: [owner(o), other(c)] });
const env = (status: string, o: string, c: string, extra: Record<string, unknown> = {}) => ({
  envelopeId: 'env-1', status, ...extra,
  recipients: { signers: [
    { recipientId: '1', routingOrder: '1', email: 'ana@bufete.es', status: o, signedDateTime: o === 'completed' ? '2026-11-02T09:00:00Z' : undefined },
    { recipientId: '2', routingOrder: '2', email: 'juan@nike.com', status: c,
      deliveredDateTime: c !== 'sent' ? '2026-11-02T09:30:00Z' : undefined,
      signedDateTime: c === 'completed' ? '2026-11-02T09:45:00Z' : undefined },
  ] },
});

test.describe('Connect payload (D8)', () => {
  test('reads envelopeSummary with recipients', () => {
    const s = summaryFromConnect({ event: 'recipient-completed', data: { envelopeId: 'env-1', envelopeSummary: env('sent', 'completed', 'sent') } });
    expect(s?.envelopeId).toBe('env-1');
    expect(s?.recipients?.signers).toHaveLength(2);
  });
  test('falls back to the event name without includeData', () => {
    expect(summaryFromConnect({ event: 'envelope-completed', data: { envelopeId: 'env-1' } })).toEqual({ envelopeId: 'env-1', status: 'completed' });
  });
  test('ignores payloads without envelopeId', () => {
    expect(summaryFromConnect({ event: 'envelope-sent', data: {} })).toBeNull();
    expect(summaryFromConnect(null)).toBeNull();
  });
});

test.describe('deriveSync — monotonic merge', () => {
  test('owner signed → sent', () => {
    const r = deriveSync(req('pending_owner', 'sent', 'created'), env('sent', 'completed', 'sent'), NOW)!;
    expect(r.status).toBe('sent');
    expect(r.recipients[0]).toMatchObject({ status: 'completed', signedAt: '2026-11-02T09:00:00Z' });
    expect(r.recipients[1].status).toBe('sent');
    expect(r.events).toEqual([{ type: 'recipient_completed', at: '2026-11-02T09:00:00Z', by: 'ana@bufete.es' }]);
  });
  test('owner opening the embedded signing adds no timeline entry', () => {
    const r = deriveSync(req('pending_owner', 'sent', 'created'), env('sent', 'delivered', 'created'), NOW)!;
    expect(r.status).toBe('pending_owner');
    expect(r.recipients[0].status).toBe('delivered');
    expect(r.events).toEqual([]);
  });
  test('counterparty opened → delivered', () => {
    const r = deriveSync(req('sent', 'completed', 'sent'), env('sent', 'completed', 'delivered'), NOW)!;
    expect(r.status).toBe('delivered');
    expect(r.events).toEqual([{ type: 'recipient_delivered', at: '2026-11-02T09:30:00Z', by: 'juan@nike.com' }]);
    expect(r.unlock).toBe(false);
  });
  test('completed keeps the document locked', () => {
    const r = deriveSync(req('delivered', 'completed', 'delivered'), env('completed', 'completed', 'completed'), NOW)!;
    expect(r.status).toBe('completed');
    expect(r.events.map(e => e.type)).toEqual(['recipient_completed', 'completed']);
    expect(r.unlock).toBe(false);
  });
  test('duplicate delivery is a no-op', () => {
    expect(deriveSync(req('delivered', 'completed', 'delivered'), env('sent', 'completed', 'delivered'), NOW)).toBeNull();
  });
  test('out-of-order (older) event never moves status back', () => {
    expect(deriveSync(req('delivered', 'completed', 'delivered'), env('sent', 'completed', 'sent'), NOW)).toBeNull();
  });
  test('terminal requests are frozen', () => {
    expect(deriveSync(req('completed', 'completed', 'completed'), env('voided', 'completed', 'completed'), NOW)).toBeNull();
  });
  test('declined unlocks', () => {
    const r = deriveSync(req('sent', 'completed', 'sent'), env('declined', 'completed', 'declined'), NOW)!;
    expect(r).toMatchObject({ status: 'declined', unlock: true });
    expect(r.events.map(e => e.type)).toEqual(['recipient_declined', 'declined']);
  });
  test('voided by expiry → expired', () => {
    const r = deriveSync(req('sent', 'completed', 'sent'), env('voided', 'completed', 'sent', { voidedReason: 'Envelope has expired.' }), NOW)!;
    expect(r).toMatchObject({ status: 'expired', unlock: true });
  });
  test('corrected email is picked up', () => {
    const e = env('sent', 'completed', 'sent');
    e.recipients.signers[1].email = 'juan.garcia@nike.com';
    const r = deriveSync(req('sent', 'completed', 'sent'), e, NOW)!;
    expect(r.recipients[1].email).toBe('juan.garcia@nike.com');
    expect(r.status).toBe('sent');
  });
});

test.describe('refresh throttle (D9)', () => {
  test('15-minute window', () => {
    expect(refreshAvailableAt(undefined)).toBe(0);
    expect(refreshAvailableAt(NOW)).toBe(Date.parse(NOW) + REFRESH_WINDOW_MS);
    expect(REFRESH_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  // D13b: the go-live review fails on repeated envelope GETs. The only GET is the throttled refresh.
  test('envelope GET is only used by refreshSignatureRequest', () => {
    const src = readFileSync(join(__dirname, '../../src/lib/signatures/server.ts'), 'utf8');
    const calls = [...src.matchAll(/getEnvelopeWithRecipients\(/g)].map(m => m.index!);
    expect(calls).toHaveLength(1);
    const owner = src.lastIndexOf('export async function', calls[0]);
    expect(src.slice(owner, owner + 60)).toContain('refreshSignatureRequest');
    const webhook = readFileSync(join(__dirname, '../../src/app/api/signatures/webhook/[token]/route.ts'), 'utf8');
    expect(webhook).not.toMatch(/docusign\/api|getEnvelope/);
  });
});

test.describe('signature layout', () => {
  const md = '# NDA\n\n## FIRMAS\n\n**A**\nNombre: Ana\nFecha: ____\nFirma: ________\n\n**B**\nNombre: Juan\nFecha: ____\nFirma: ________';
  test('party blocks stay together and the sign line has room above it', () => {
    const html = buildDocHtml(md, 'NDA', undefined, undefined, { forSignature: true });
    expect(html).toContain('.sig-section p { page-break-inside: avoid; break-inside: avoid; }');
    expect(html.match(/Firma: <span class="ds-sig">/g)).toHaveLength(2);
  });
});

test.describe('signed PDF filing (Phase 4)', () => {
  test('name and path next to the original', () => {
    const at = new Date('2026-11-02T14:34:00Z');                    // 15:34 in Madrid (CET)
    expect(signedFileName('NDA_MFW_MDC.doc', at)).toBe('NDA_MFW_MDC_firmado_2026-11-02_15-34.pdf');
    expect(signedFileName('Contrato.v2.docx', at)).toBe('Contrato.v2_firmado_2026-11-02_15-34.pdf');
    expect(signedFileName('X_firmado.pdf', at)).toBe('X_firmado_2026-11-02_15-34.pdf');
    expect(signedFileName('X_firmado_2026-10-01_09-00.pdf', at)).toBe('X_firmado_2026-11-02_15-34.pdf');
    expect(signedFileName('Y.doc', new Date('2026-07-01T22:30:00Z'))).toBe('Y_firmado_2026-07-02_00-30.pdf'); // CEST
    // The generated document's stamp is replaced by the signing one, not repeated.
    expect(signedFileName('NDA_MFW_MCC_2026-11-02_21-40.doc', at)).toBe('NDA_MFW_MCC_firmado_2026-11-02_15-34.pdf');
    expect(signedStoragePath('users/u1/abogado/casos/c9/1746_NDA.doc', 'u1', 5, 'NDA_firmado.pdf'))
      .toBe('users/u1/abogado/casos/c9/5_NDA_firmado.pdf');
    // Never write outside the owner's folder (rules: users/{uid}/**)
    expect(signedStoragePath('users/other/x/1_NDA.doc', 'u1', 5, 'a.pdf')).toBe('users/u1/documents/5_a.pdf');
    expect(signedStoragePath(undefined, 'u1', 5, 'a.pdf')).toBe('users/u1/documents/5_a.pdf');
    expect(firebaseDownloadUrl('b.app', 'users/u1/a b.pdf', 't')).toBe('https://firebasestorage.googleapis.com/v0/b/b.app/o/users%2Fu1%2Fa%20b.pdf?alt=media&token=t');
  });

  test('combined download is only reached through fileSignedDocument', () => {
    const src = readFileSync(join(__dirname, '../../src/lib/signatures/server.ts'), 'utf8');
    const calls = [...src.matchAll(/downloadCombinedPdf\(/g)].map(m => m.index!);
    expect(calls).toHaveLength(1);
    const owner = src.lastIndexOf('export async function', calls[0]);
    expect(src.slice(owner, owner + 60)).toContain('fileSignedDocument');
    // Exactly once: guarded by signedDocumentId + a lease in a transaction.
    expect(src).toMatch(/cur\.signedDocumentId\) return null/);
  });
});

test.describe('generated document names', () => {
  const at = new Date('2026-11-02T20:40:00Z');                       // 21:40 in Madrid
  test('stamped with the creation date-time', () => {
    expect(stampedFileName('NDA_MFW_MCC.doc', at)).toBe('NDA_MFW_MCC_2026-11-02_21-40.doc');
    expect(stampedFileName('Contrato.v2.doc', at)).toBe('Contrato.v2_2026-11-02_21-40.doc');
    expect(stampedFileName('NDA_MFW_MCC_2026-10-01_09-00.doc', at)).toBe('NDA_MFW_MCC_2026-11-02_21-40.doc');
    expect(stampedFileName('Sin_extension', at)).toBe('Sin_extension_2026-11-02_21-40');
  });
  test('the stamp stays out of the DocuSign subject', () => {
    expect(signatureTitleFromName('NDA_MFW_MCC_2026-11-02_21-40.doc')).toBe('NDA MFW MCC');
  });
  test('only generated documents are stamped on save', () => {
    const src = readFileSync(join(__dirname, '../../src/lib/storage-client.ts'), 'utf8');
    expect(src).toMatch(/source === 'generated' \? stampedFileName\(/);
  });
});
