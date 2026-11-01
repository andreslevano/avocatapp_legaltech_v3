import { test, expect } from '@playwright/test';
import { buildEnvelopeDefinition, TAB_OFFSETS, webhookUrlFor } from '@/lib/docusign/envelope';
import { friendlyDocusignError } from '@/lib/docusign/api';
import { buildDocHtml, countSignatureBlocks, signatureAnchor } from '@/lib/doc-html';
import {
  DEFAULT_SIGNATURE_OPTIONS, isActiveStatus, outcomeForEvent, validateSignatureInput, type CreateSignatureInput,
} from '@/lib/signatures/types';

const base = {
  html: '<html>NDA</html>', documentName: 'NDA — ACME / NIKE', subject: 'Firma solicitada: NDA', message: 'Hola',
  owner: { name: 'Ana Abogada', email: 'ana@bufete.es', clientUserId: 'uid-1' },
  counterparty: { name: ' Juan García ', email: ' juan@nike.com ' },
  options: DEFAULT_SIGNATURE_OPTIONS, requestId: 'req-1', webhookUrl: null,
};
type Signer = { routingOrder: string; email: string; name: string; clientUserId?: string;
  tabs: { signHereTabs: { anchorString: string; anchorYOffset: string }[]; dateSignedTabs: { anchorString: string }[] } };
interface Dump {
  status: string; eventNotification?: { url: string; eventData: { includeData: string[] } };
  documents: { fileExtension: string; documentBase64: string }[];
  notification: { reminders: Record<string, string>; expirations: { expireAfter: string } };
}
const dump = (d: unknown) => d as Dump;
const signers = (d: Record<string, unknown>) => (d.recipients as { signers: Signer[] }).signers;

test.describe('envelope definition (D5/D7)', () => {
  test('owner is embedded signer 1, counterparty remote signer 2', () => {
    const [s1, s2] = signers(buildEnvelopeDefinition(base));
    expect(s1).toMatchObject({ routingOrder: '1', email: 'ana@bufete.es', clientUserId: 'uid-1' });
    expect(s2).toMatchObject({ routingOrder: '2', email: 'juan@nike.com', name: 'Juan García' });
    expect(s2.clientUserId).toBeUndefined();
  });
  test('tabs use the Phase 0 anchors and calibrated offsets', () => {
    const [s1, s2] = signers(buildEnvelopeDefinition(base));
    expect(s1.tabs.signHereTabs[0].anchorString).toBe('\\s1\\');
    expect(s2.tabs.signHereTabs[0].anchorString).toBe('\\s2\\');
    expect(s2.tabs.dateSignedTabs[0].anchorString).toBe('\\d2\\');
    expect(s1.tabs.signHereTabs[0].anchorYOffset).toBe(String(TAB_OFFSETS.signHere.y));
  });
  test('sends the HTML document, status sent, reminders and expiry', () => {
    const d = dump(buildEnvelopeDefinition(base));
    expect(d.status).toBe('sent');
    expect(d.documents[0].fileExtension).toBe('html');
    expect(Buffer.from(d.documents[0].documentBase64, 'base64').toString()).toBe('<html>NDA</html>');
    expect(d.notification.reminders).toMatchObject({ reminderDelay: '3', reminderFrequency: '3' });
    expect(d.notification.expirations.expireAfter).toBe('30');
  });
  test('no eventNotification without a public https webhook (D13c)', () => {
    expect(buildEnvelopeDefinition(base).eventNotification).toBeUndefined();
    expect(webhookUrlFor('http://localhost:3000', 't')).toBeNull();
    expect(webhookUrlFor(undefined, 't')).toBeNull();
    const url = webhookUrlFor('https://avocatapp.com/', 'tok');
    expect(url).toBe('https://avocatapp.com/api/signatures/webhook/tok');
    const d = dump(buildEnvelopeDefinition({ ...base, webhookUrl: url }));
    expect(d.eventNotification?.url).toBe(url);
    expect(d.eventNotification?.eventData.includeData).toEqual(['recipients']);
  });
});

test.describe('signature input & events', () => {
  const ok: CreateSignatureInput = {
    documentId: 'd1', markdown: 'x'.repeat(300), title: 'NDA',
    counterparty: { name: 'Juan', email: 'juan@nike.com' }, subject: 'Firma', message: '', options: DEFAULT_SIGNATURE_OPTIONS,
  };
  test('valid input passes', () => expect(validateSignatureInput(ok)).toBeNull());
  test('rejects bad email, empty name, long subject, bad options', () => {
    expect(validateSignatureInput({ ...ok, counterparty: { name: 'J', email: 'juan@' } })).toMatch(/email/);
    expect(validateSignatureInput({ ...ok, counterparty: { name: ' ', email: 'j@n.com' } })).toMatch(/nombre/);
    expect(validateSignatureInput({ ...ok, subject: 'x'.repeat(101) })).toMatch(/100/);
    expect(validateSignatureInput({ ...ok, options: { ...ok.options, expireAfterDays: 0 } })).toMatch(/caducidad/);
  });
  test('return events map to screens', () => {
    expect(outcomeForEvent('signing_complete')).toBe('signed');
    expect(outcomeForEvent('cancel')).toBe('pending');
    expect(outcomeForEvent('ttl_expired')).toBe('expired');
    expect(outcomeForEvent('decline')).toBe('declined');
    expect(outcomeForEvent('exception')).toBe('error');
  });
  test('active vs terminal statuses', () => {
    expect(isActiveStatus('pending_owner')).toBe(true);
    expect(isActiveStatus('sent')).toBe(true);
    expect(isActiveStatus('completed')).toBe(false);
    expect(isActiveStatus(undefined)).toBe(false);
  });
  test('DocuSign errors become friendly codes', () => {
    expect(friendlyDocusignError(400, 'INVALID_EMAIL_ADDRESS_FOR_RECIPIENT').code).toBe('invalid_email');
    expect(friendlyDocusignError(400, 'ENVELOPE_ALLOWANCE_EXCEEDED').code).toBe('quota');
    expect(friendlyDocusignError(401).code).toBe('reconnect_required');
    expect(friendlyDocusignError(500, 'WHATEVER').code).toBe('docusign_error');
  });
});

test.describe('anchors with bold labels', () => {
  const md = '## FIRMAS\n\n**ACME**\n**Fecha:** ____________\n**Firma:** ______________\n\n**NIKE**\n**Fecha:** ____________\n**Firma:** ______________';
  test('counts and anchors bold "Firma:" lines', () => {
    expect(countSignatureBlocks(md)).toBe(2);
    const html = buildDocHtml(md, 'NDA', undefined, undefined, { forSignature: true });
    expect(html).toContain(signatureAnchor(2));
    expect(html).toContain('<strong>Firma:</strong>');
  });
});
