// Yousign provider: config helpers, webhook HMAC + parsing, event → status mapping (plan §4, §7).
import { expect, test } from '@playwright/test';
import { createHmac } from 'crypto';
import { defaultProvider, embedLink, expirationDate, splitName } from '@/lib/signatures/providers/yousign/config';
import { parseYousignEvent, verifyYousignSignature } from '@/lib/signatures/providers/yousign/webhook';
import { summaryFromYousignEvent, summaryFromYousignState } from '@/lib/signatures/providers/yousign/map';
import { deriveSync } from '@/lib/signatures/sync';
import type { SignatureRequest } from '@/lib/signatures/types';
import { signerInviteEmail } from '@/lib/signatures/invite-email';
import { recipientsToInvite } from '@/lib/signatures/invites';

const SECRET = 'whsec_test_123';
const sign = (body: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

test.describe('webhook HMAC', () => {
  const body = JSON.stringify({ event_id: 'e1', event_name: 'signer.done', data: {} });
  test('valid signature passes; wrong secret, tampered body, bad header fail', () => {
    expect(verifyYousignSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyYousignSignature(Buffer.from(body), sign(body).toUpperCase().replace('SHA256=', 'sha256='), SECRET)).toBe(true);
    expect(verifyYousignSignature(body, sign(body, 'other'), SECRET)).toBe(false);
    expect(verifyYousignSignature(body + ' ', sign(body), SECRET)).toBe(false);
    expect(verifyYousignSignature(body, sign(body).replace('sha256=', ''), SECRET)).toBe(false);
    expect(verifyYousignSignature(body, null, SECRET)).toBe(false);
    expect(verifyYousignSignature(body, sign(body), '')).toBe(false);
    expect(verifyYousignSignature(body, 'sha256=zz', SECRET)).toBe(false);
  });
  test('payload parsing', () => {
    const ev = parseYousignEvent({
      event_id: 'evt_1', event_name: 'signer.declined', event_time: '1763640000', sandbox: true,
      data: { signature_request: { id: 'sr1', external_id: 'req1' }, signer: { id: 'sg2' }, reason: 'No estoy de acuerdo' },
    });
    expect(ev).toEqual({ eventId: 'evt_1', eventName: 'signer.declined', eventTime: '1763640000', sandbox: true, signatureRequestId: 'sr1', externalId: 'req1', signerId: 'sg2', reason: 'No estoy de acuerdo' });
    expect(parseYousignEvent({ event_name: 'x' })).toBeNull();
    expect(parseYousignEvent({ event_id: '../x', event_name: 'x' })).toBeNull();
    expect(parseYousignEvent(null)).toBeNull();
  });
});

test.describe('config', () => {
  test('provider selection', () => {
    expect(defaultProvider({ YOUSIGN_API_KEY: 'k' })).toBe('yousign');
    expect(defaultProvider({ YOUSIGN_API_KEY: 'k', SIGNATURE_PROVIDER_DEFAULT: 'docusign' })).toBe('yousign');            // DocuSign not enabled
    expect(defaultProvider({ YOUSIGN_API_KEY: 'k', SIGNATURE_PROVIDER_DEFAULT: 'docusign', DOCUSIGN_ENABLED: 'true' })).toBe('docusign');
    expect(defaultProvider({ DOCUSIGN_ENABLED: 'true' })).toBe('docusign');                                              // no Yousign key yet
    expect(defaultProvider({})).toBe('docusign');                                // no key: today's behaviour, nothing breaks
    expect(defaultProvider({ DOCUSIGN_ENABLED: 'false' })).toBe('yousign');
  });
  test('expiration date: date only, 1..365 days', () => {
    const now = new Date('2026-11-20T23:30:00Z');
    expect(expirationDate(now, 30)).toBe('2026-12-20');
    expect(expirationDate(now, 0)).toBe('2026-11-21');
    expect(expirationDate(now, 9999)).toBe('2027-11-20');
    expect(expirationDate(now, 30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('sandbox link param and names', () => {
    expect(embedLink('https://yousign.app/s/abc', true)).toBe('https://yousign.app/s/abc?disable_domain_validation=true');
    expect(embedLink('https://yousign.app/s/abc?x=1', true)).toBe('https://yousign.app/s/abc?x=1&disable_domain_validation=true');
    expect(embedLink('https://yousign.app/s/abc', false)).toBe('https://yousign.app/s/abc');
    expect(splitName('Ana María López')).toEqual({ first_name: 'Ana', last_name: 'María López' });
    expect(splitName('Madonna')).toEqual({ first_name: 'Madonna', last_name: 'Madonna' });
  });
});

test.describe('event → status (with the existing monotonic merge)', () => {
  const NOW = '2026-11-20T10:00:00.000Z';
  const base = (): Pick<SignatureRequest, 'status' | 'recipients' | 'yousign' | 'signingOrder'> => ({
    status: 'pending_owner', signingOrder: 'sequential',
    yousign: { signatureRequestId: 'sr1', documentId: 'd1', signers: [{ recipientKey: 1, signerId: 'o' }, { recipientKey: 2, signerId: 'a' }, { recipientKey: 3, signerId: 'b' }] },
    recipients: [
      { role: 'owner', name: 'Ana', email: 'ana@x.es', recipientId: 1, routingOrder: 1, status: 'sent' },
      { role: 'signer', name: 'Juan', email: 'juan@x.es', recipientId: 2, routingOrder: 2, status: 'created' },
      { role: 'signer', name: 'Lola', email: 'lola@x.es', recipientId: 3, routingOrder: 3, status: 'created' },
    ],
  });
  const ev = (eventName: string, signerId: string | null = null, reason: string | null = null) =>
    ({ eventId: 'x', eventName, eventTime: '1763632800', sandbox: true, signatureRequestId: 'sr1', externalId: 'r', signerId, reason });
  const apply = (r: ReturnType<typeof base>, e: ReturnType<typeof ev>) => {
    const s = summaryFromYousignEvent(r, e);
    return s ? deriveSync(r, s, NOW) : null;
  };

  test('owner signs → Enviado, first counterparty in line', () => {
    const res = apply(base(), ev('signer.done', 'o'))!;
    expect(res.status).toBe('sent');
    expect(res.recipients.map(x => x.status)).toEqual(['completed', 'sent', 'created']);
  });
  test('counterparty opens → Visto; signs; request done → Firmado', () => {
    let r: ReturnType<typeof base> = { ...base(), status: 'sent', recipients: base().recipients.map((x, i) => (i === 0 ? { ...x, status: 'completed' as const } : i === 1 ? { ...x, status: 'sent' as const } : x)) };
    let res = apply(r, ev('signer.link_opened', 'a'))!;
    expect(res.recipients[1].status).toBe('delivered');
    expect(res.events.map(e => e.type)).toEqual(['recipient_delivered']);
    r = { ...r, status: res.status, recipients: res.recipients };
    res = apply(r, ev('signer.done', 'a'))!;
    expect(res.recipients[1].status).toBe('completed');
    expect(res.recipients[2].status).toBe('sent');                 // in order: Lola's turn now
    r = { ...r, status: res.status, recipients: res.recipients };
    res = apply(r, ev('signature_request.done'))!;
    expect(res.status).toBe('completed');
    expect(res.unlock).toBe(false);
  });
  test('the owner opening is not a timeline event', () => {
    expect(summaryFromYousignEvent(base(), ev('signer.link_opened', 'o'))).toBeNull();
  });
  test('declined with reason unlocks', () => {
    const r = { ...base(), status: 'sent' as const };
    const res = apply(r, ev('signer.declined', 'a', 'Cláusula 6 inaceptable'))!;
    expect(res.status).toBe('declined');
    expect(res.unlock).toBe(true);
    expect(res.recipients[1]).toMatchObject({ status: 'declined', declinedReason: 'Cláusula 6 inaceptable' });
  });
  test('expired / canceled', () => {
    expect(apply(base(), ev('signature_request.expired'))!.status).toBe('expired');
    expect(apply(base(), ev('signature_request.canceled'))!.status).toBe('voided');
  });
  test('duplicates and terminal requests are no-ops; unknown signers ignored', () => {
    const r = { ...base(), status: 'sent' as const, recipients: base().recipients.map((x, i) => (i === 0 ? { ...x, status: 'completed' as const } : x)) };
    expect(apply(r, ev('signer.done', 'o'))).toBeNull();
    expect(apply({ ...base(), status: 'completed' }, ev('signer.declined', 'a'))).toBeNull();
    expect(summaryFromYousignEvent(base(), ev('signer.done', 'zzz'))).toBeNull();
    expect(summaryFromYousignEvent(base(), ev('signer.notified', 'a'))).toBeNull();
  });
  test('parallel: every counterparty gets their turn when the owner signs', () => {
    const r = { ...base(), signingOrder: 'parallel' as const, recipients: base().recipients.map(x => (x.role === 'signer' ? { ...x, routingOrder: 2 } : x)) };
    expect(apply(r, ev('signer.done', 'o'))!.recipients.map(x => x.status)).toEqual(['completed', 'sent', 'sent']);
  });
  test('manual refresh state', () => {
    const s = summaryFromYousignState(base(), { status: 'ongoing', signers: [{ id: 'o', status: 'signed' }, { id: 'a', status: 'notified' }] });
    expect(s.recipients?.signers).toEqual([{ recipientId: '1', status: 'completed' }, { recipientId: '2', status: 'sent' }]);
    expect(summaryFromYousignState(base(), { status: 'expired' })).toMatchObject({ status: 'voided', voidedReason: 'expired' });
  });
});

test.describe('counterparty invite email', () => {
  test('subject, button, escaping, reminder', () => {
    const m = signerInviteEmail({ ownerName: 'Ana <b>', ownerEmail: 'ana@x.es', signerName: 'Juan Pérez', title: 'NDA', link: 'https://avocatapp.com/firma/t', language: 'es', message: 'Hola Juan' });
    expect(m.subject).toBe('Ana <b> (vía Avocat) te ha enviado un documento para firmar');
    expect(m.html).toContain('Revisar y firmar');
    expect(m.html).toContain('Ana &lt;b&gt;');
    expect(m.html).not.toContain('<b> (vía');
    expect(m.text).toContain('https://avocatapp.com/firma/t');
    expect(m.text).toContain('firma electrónica simple (eIDAS) con Yousign');
    const r = signerInviteEmail({ ownerName: 'Ana', signerName: 'Juan', title: 'NDA', link: 'l', language: 'en', reminder: true });
    expect(r.text).toContain('Reminder');
  });
  test('who gets invited', () => {
    const recs = [
      { role: 'owner' as const, name: 'A', email: 'a@x', routingOrder: 1, status: 'completed' as const },
      { role: 'signer' as const, name: 'B', email: 'b@x', routingOrder: 2, status: 'sent' as const },
      { role: 'signer' as const, name: 'C', email: 'c@x', routingOrder: 3, status: 'created' as const },
      { role: 'signer' as const, name: 'D', email: 'd@x', routingOrder: 2, status: 'delivered' as const, invitedAt: 'x' },
    ];
    expect(recipientsToInvite({ status: 'sent', recipients: recs }, false).map(x => x.name)).toEqual(['B']);
    expect(recipientsToInvite({ status: 'sent', recipients: recs }, true).map(x => x.name)).toEqual(['B', 'D']);
    expect(recipientsToInvite({ status: 'pending_owner', recipients: recs }, false)).toEqual([]);
  });
});
