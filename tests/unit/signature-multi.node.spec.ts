import { test, expect } from '@playwright/test';
import { buildEnvelopeDefinition } from '@/lib/docusign/envelope';
import { buildDocHtml, missingSignatureBlocksMd, signingHtmlFromSaved, withSignatureBlocks, countSignatureBlocks } from '@/lib/doc-html';
import { planRecipients, recipientKey } from '@/lib/signatures/recipients';
import { deriveSync } from '@/lib/signatures/sync';
import { DEFAULT_SIGNATURE_OPTIONS, validateSignatureInput, type SignatureRecipient } from '@/lib/signatures/types';

const base = {
  html: '<html>X</html>', documentName: 'Contrato', subject: 'Firma', message: 'Hola',
  owner: { name: 'Ana', email: 'ana@bufete.es', clientUserId: 'uid-1' },
  signers: [{ name: 'Juan', email: 'juan@a.com' }, { name: 'Eva', email: 'eva@b.com', accessCode: 'K7Q2' }, { name: 'Leo', email: 'leo@c.com' }],
  cc: [{ name: 'Socio', email: 'socio@bufete.es' }],
  options: DEFAULT_SIGNATURE_OPTIONS, requestId: 'req-1', webhookUrl: null,
};
type S = { recipientId: string; routingOrder: string; email: string; accessCode?: string; tabs: { signHereTabs: { anchorString: string }[] } };
const recips = (d: Record<string, unknown>) => d.recipients as { signers: S[]; carbonCopies: { recipientId: string; routingOrder: string; email: string }[] };

test.describe('recipient plan (5b)', () => {
  test('sequential: owner 1, then 2, 3, 4; CC with the last', () => {
    expect(planRecipients(3, 1, 'sequential')).toEqual({
      signers: [{ recipientId: 2, routingOrder: 2 }, { recipientId: 3, routingOrder: 3 }, { recipientId: 4, routingOrder: 4 }],
      cc: [{ recipientId: 5, routingOrder: 4 }],
    });
  });
  test('parallel: every counterparty at routing 2', () => {
    const p = planRecipients(3, 2, 'parallel');
    expect(p.signers.map(s => s.routingOrder)).toEqual([2, 2, 2]);
    expect(p.cc).toEqual([{ recipientId: 5, routingOrder: 2 }, { recipientId: 6, routingOrder: 2 }]);
  });
  test('older records key by routing order', () => {
    expect(recipientKey({ routingOrder: 2 })).toBe(2);
    expect(recipientKey({ recipientId: 4, routingOrder: 2 })).toBe(4);
  });
});

test.describe('envelope with several signers (5b)', () => {
  test('sequential, anchors per signer, access code, CC', () => {
    const r = recips(buildEnvelopeDefinition({ ...base, signingOrder: 'sequential' }));
    expect(r.signers.map(s => [s.recipientId, s.routingOrder, s.tabs.signHereTabs[0].anchorString]))
      .toEqual([['1', '1', '\\s1\\'], ['2', '2', '\\s2\\'], ['3', '3', '\\s3\\'], ['4', '4', '\\s4\\']]);
    expect(r.signers[2].accessCode).toBe('K7Q2');
    expect(r.signers[1].accessCode).toBeUndefined();
    expect(r.carbonCopies).toEqual([expect.objectContaining({ recipientId: '5', routingOrder: '4', email: 'socio@bufete.es' })]);
  });
  test('parallel', () => {
    const r = recips(buildEnvelopeDefinition({ ...base, signingOrder: 'parallel' }));
    expect(r.signers.map(s => s.routingOrder)).toEqual(['1', '2', '2', '2']);
  });
});

test.describe('signature blocks for N signers (5b)', () => {
  const body = '# CONTRATO\n\n' + 'Texto. '.repeat(40);
  test('appends the missing ones in signer order', () => {
    const md = withSignatureBlocks(`${body}\n\n## FIRMAS\n\n**A**\nFecha: ____\nFirma: ____\n\n**B**\nFecha: ____\nFirma: ____`, ['Ana', 'Juan', 'Eva', 'Leo']);
    expect(countSignatureBlocks(md)).toBe(4);
    expect(md.indexOf('**Eva**')).toBeLessThan(md.indexOf('**Leo**'));
    expect(missingSignatureBlocksMd(4, ['Ana', 'Juan', 'Eva', 'Leo'])).toBe('');
  });
  test('saved .doc gets anchors 1..4', () => {
    const html = signingHtmlFromSaved(buildDocHtml(body, 'X'), ['Ana', 'Juan', 'Eva', 'Leo'])!;
    for (let n = 1; n <= 4; n++) expect(html).toContain(`\\s${n}\\`);
  });
});

test.describe('input validation (5b)', () => {
  const ok = { documentId: 'd1', title: 'X', signers: [{ name: 'Juan', email: 'juan@a.com' }], subject: 'S', message: '', options: DEFAULT_SIGNATURE_OPTIONS };
  test('limits, duplicates, access codes, order', () => {
    expect(validateSignatureInput({ ...ok, signers: [] })).toMatch(/firmar/);
    expect(validateSignatureInput({ ...ok, signers: Array.from({ length: 6 }, (_, i) => ({ name: 'P', email: `p${i}@a.com` })) })).toMatch(/Máximo 5/);
    expect(validateSignatureInput({ ...ok, cc: [{ name: '', email: 'JUAN@a.com' }] })).toMatch(/distinto/);
    expect(validateSignatureInput({ ...ok, signers: [{ name: 'Juan', email: 'juan@a.com', accessCode: '12' }] })).toMatch(/código/);
    expect(validateSignatureInput({ ...ok, signers: [{ name: 'Juan', email: 'juan@a.com', accessCode: 'AB12' }] })).toBeNull();
    expect(validateSignatureInput({ ...ok, signingOrder: 'random' as never })).toMatch(/Orden/);
    expect(validateSignatureInput({ ...ok, cc: [{ name: 'S', email: 'socio@b.com' }], signingOrder: 'parallel' })).toBeNull();
  });
});

test.describe('webhook merge with parallel signers (5b)', () => {
  const rec = (recipientId: number, role: SignatureRecipient['role'], status: SignatureRecipient['status'], routingOrder = 2): SignatureRecipient =>
    ({ role, name: `R${recipientId}`, email: `r${recipientId}@x.com`, recipientId, routingOrder, status });
  const current = { status: 'sent' as const, recipients: [rec(1, 'owner', 'completed', 1), rec(2, 'signer', 'sent'), rec(3, 'signer', 'sent'), rec(4, 'cc', 'created')] };
  const env = (s2: string, s3: string, status = 'sent') => ({ envelopeId: 'e', status, recipients: { signers: [
    { recipientId: '1', routingOrder: '1', status: 'completed' },
    { recipientId: '2', routingOrder: '2', status: s2 },
    { recipientId: '3', routingOrder: '2', status: s3 },
  ] } });

  test('same routing order, matched by recipientId', () => {
    const r = deriveSync(current, env('completed', 'sent'), '2026-11-02T10:00:00Z')!;
    expect(r.recipients.map(x => x.status)).toEqual(['completed', 'completed', 'sent', 'created']);
    expect(r.status).toBe('sent');
  });
  test('delivered only when every signer opened; CC ignored', () => {
    expect(deriveSync(current, env('delivered', 'sent'), 'now')!.status).toBe('sent');
    expect(deriveSync(current, env('delivered', 'delivered'), 'now')!.status).toBe('delivered');
  });
  test('completed when DocuSign says so', () => {
    const r = deriveSync(current, env('completed', 'completed', 'completed'), 'now')!;
    expect(r.status).toBe('completed');
    expect(r.events.filter(e => e.type === 'recipient_completed')).toHaveLength(2);
  });
});
