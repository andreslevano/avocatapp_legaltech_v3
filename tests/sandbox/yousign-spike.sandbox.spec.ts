// Y0 — Yousign sandbox spike (docs/yousign/YOUSIGN_IMPLEMENTATION_PLAN.md §11). Answers the [spike]
// questions against the real sandbox API and writes the findings to screenshots/yousign-spike.json.
// Nothing is emailed (delivery_mode 'none'). The request is cancelled at the end unless KEEP=1,
// which prints the signing links so you can sign in a browser and then run DOWNLOAD=<request id>.
//
//   npx playwright test -c playwright.sandbox.config.ts
//   KEEP=1 npx playwright test -c playwright.sandbox.config.ts            # sign by hand afterwards
//   DOWNLOAD=<signature_request id> npx playwright test -c playwright.sandbox.config.ts   # after signing
import { test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { renderSigningPdf } from '@/lib/signatures/providers/yousign/pdf';
import { expirationDate, embedLink } from '@/lib/signatures/providers/yousign/config';

loadEnv({ path: '.env.local' });
const KEY = process.env.YOUSIGN_API_KEY ?? '';
const BASE = (process.env.YOUSIGN_API_BASE ?? '').replace(/\/+$/, '');

type R = { status: number; type: string; json: unknown; text: string };
async function call(method: string, path: string, body?: unknown): Promise<R> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json', ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') ?? '';
  const buf = Buffer.from(await res.arrayBuffer());
  let json: unknown = null; const text = /json/.test(type) ? buf.toString('utf8') : `<${buf.length} bytes ${type}>`;
  try { json = JSON.parse(buf.toString('utf8')); } catch { /* binary */ }
  return { status: res.status, type, json, text: text.slice(0, 600) };
}

test('Yousign sandbox spike', async () => {
  test.skip(!KEY || !BASE, 'YOUSIGN_API_KEY / YOUSIGN_API_BASE not set in .env.local');
  if (!/api-sandbox\.yousign\.app/.test(BASE)) throw new Error('Refusing to run the spike outside the sandbox.');
  const f: Record<string, unknown> = { base: BASE, at: new Date().toISOString() };
  mkdirSync('screenshots', { recursive: true });
  const save = () => writeFileSync('screenshots/yousign-spike.json', JSON.stringify(f, null, 2));

  if (process.env.DOWNLOAD) {
    const id = process.env.DOWNLOAD;
    const sr = await call('GET', `/signature_requests/${id}`);
    f.request = sr.json;
    f.downloadSigned = await call('GET', `/signature_requests/${id}/documents/download`).then(r => ({ status: r.status, type: r.type, body: r.text }));
    const signers = ((sr.json as { signers?: { id: string }[] })?.signers ?? []);
    f.auditTrails = await Promise.all(signers.map(s => call('GET', `/signature_requests/${id}/signers/${s.id}/audit_trails/download`).then(r => ({ signer: s.id, status: r.status, type: r.type }))));
    save(); console.log(JSON.stringify(f, null, 2)); return;
  }

  // 1) Our signing PDF + field boxes.
  const md = renderMfwNda({ receptor: { tipo: 'persona', nombre: 'Parte Spike', domicilio: 'Calle 1', documento: 'DNI 1', email: 'party@example.com' }, productos: 'Producto spike' });
  const pdf = await renderSigningPdf(md, { title: 'NDA spike', authorName: 'MOBIFORWORK S.L.' });
  f.fields = pdf.fields;

  // 2) Request (draft).
  const cr = await call('POST', '/signature_requests', {
    name: `Avocat spike ${Date.now()}`, delivery_mode: 'none', ordered_signers: true, signers_allowed_to_decline: true,
    expiration_date: expirationDate(new Date(), 30), timezone: 'Europe/Madrid', audit_trail_locale: 'es', external_id: `spike-${Date.now()}`,
  });
  f.create = { status: cr.status, body: cr.json };
  const id = (cr.json as { id?: string })?.id;
  if (!id) { save(); throw new Error(`create failed: ${cr.text}`); }

  // 3) Document.
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(pdf.pdf)], { type: 'application/pdf' }), 'NDA_spike.pdf');
  form.append('nature', 'signable_document');
  const doc = await call('POST', `/signature_requests/${id}/documents`, form);
  f.document = { status: doc.status, body: doc.json };
  const docId = (doc.json as { id?: string })?.id;

  // 4) Signers with signature fields by coordinates (+ a date "mention" try on signer 1).
  const signerIds: string[] = [];
  for (const [i, who] of [['Owner Spike', 'owner@example.com'], ['Party Spike', 'party@example.com']].entries()) {
    const boxes = pdf.fields.filter(b => b.kind === 'signature' && b.signer === i + 1);
    const s = await call('POST', `/signature_requests/${id}/signers`, {
      info: { first_name: who[0].split(' ')[0], last_name: who[0].split(' ')[1], email: who[1], locale: 'es' },
      signature_level: 'electronic_signature', signature_authentication_mode: 'no_otp',
      fields: boxes.map(b => ({ document_id: docId, type: 'signature', page: b.page, x: b.x, y: b.y, width: b.width, height: b.height })),
    });
    f[`signer${i + 1}`] = { status: s.status, body: s.json };
    signerIds.push((s.json as { id?: string })?.id ?? '');
  }
  const date = pdf.fields.find(b => b.kind === 'date' && b.signer === 1);
  if (date) {
    const m = await call('POST', `/signature_requests/${id}/documents/${docId}/fields`, {
      signer_id: signerIds[0], type: 'mention', mention: '%date%', page: date.page, x: date.x, y: date.y, width: date.width, height: date.height,
    });
    f.dateMention = { status: m.status, body: m.json ?? m.text };
  }

  // 5) Activate → are both links returned with ordered_signers + delivery none?
  const act = await call('POST', `/signature_requests/${id}/activate`);
  f.activate = { status: act.status, body: act.json };

  // 6) A fresh link after activation? (GET the signer twice)
  const g1 = await call('GET', `/signature_requests/${id}/signers/${signerIds[1]}`);
  const g2 = await call('GET', `/signature_requests/${id}/signers/${signerIds[1]}`);
  const link = (r: R) => (r.json as { signature_link?: string | null })?.signature_link ?? null;
  f.freshLink = { status: g1.status, hasLink: !!link(g1), sameOnSecondGet: link(g1) === link(g2), expiration: (g1.json as { signature_link_expiration_date?: string })?.signature_link_expiration_date };

  // 7) Change a signer's email after activation?
  const patch = await call('PATCH', `/signature_requests/${id}/signers/${signerIds[1]}`, { info: { email: 'party2@example.com' } });
  f.patchSignerAfterActivation = { status: patch.status, body: patch.json ?? patch.text };

  // 8) Reminder with delivery none?
  const rem = await call('POST', `/signature_requests/${id}/signers/${signerIds[1]}/send_reminder`);
  f.reminderDeliveryNone = { status: rem.status, body: rem.json ?? rem.text };

  if (process.env.KEEP) {
    const owner = await call('GET', `/signature_requests/${id}/signers/${signerIds[0]}`);
    console.log('\nSign as the owner, then the party (sandbox links — treat them as secrets, do not share):');
    console.log('owner:', link(owner) && embedLink(link(owner)!, true));
    console.log('party:', link(g1) && embedLink(link(g1)!, true));
    console.log(`Afterwards: DOWNLOAD=${id} npx playwright test -c playwright.sandbox.config.ts\n`);
    f.kept = id;
  } else {
    // 9) Cancel body.
    const cancel = await call('POST', `/signature_requests/${id}/cancel`, { reason: 'contractualization_aborted', custom_note: 'Avocat spike' });
    f.cancel = { status: cancel.status, body: cancel.json ?? cancel.text };
  }
  // Signing links are credentials: strip them from the saved findings.
  const redacted = JSON.stringify(f, null, 2).replace(/https:\/\/[^"]*yousign[^"]*sign[^"]*/g, '<signing link>');
  writeFileSync('screenshots/yousign-spike.json', redacted);
  console.log(redacted);
});
