// Yousign (API v3) behind the SignatureProvider interface — primary provider (plan §3–§8).
// One Avocat-owned API key; delivery_mode 'none' for every signer: the owner signs embedded
// (iframe), the others through Avocat's emails (/firma/{token}). Signing links are fetched fresh
// and never stored. Server-only.

import { authAdmin, db } from '@/lib/firebase-admin';
import { loadOwnerBranding } from '@/lib/branding-server';
import { recipientKey } from '../../recipients';
import { sendSignerInvites } from '../../invites';
import type { SignatureRequest } from '../../types';
import type { SignatureProvider } from '../types';
import { ProviderApiError, ys, ysBinary } from './client';
import { embedLink, expirationDate, splitName, ysConfig } from './config';
import { htmlToSigningMarkdown, renderSigningPdf } from './pdf';
import { summaryFromYousignState } from './map';

interface YsRequest { id: string; status?: string; signers?: { id: string; status?: string; signature_link?: string | null }[] }
interface YsDocument { id: string }
interface YsSigner { id: string; status?: string; signature_link?: string | null }

const fail = (message: string, code: string, status: number) => new ProviderApiError(message, code, status);

const signerOf = (r: Pick<SignatureRequest, 'yousign'>, key: number) => {
  const s = r.yousign?.signers.find(x => x.recipientKey === key);
  if (!s || !r.yousign) throw fail('Solicitud de firma no válida.', 'invalid', 500);
  return { sr: r.yousign.signatureRequestId, signerId: s.signerId };
};

/** A fresh signing link for one signer (never stored). [spike Y0: confirm the signer GET returns it] */
export async function freshSigningLink(r: Pick<SignatureRequest, 'yousign'>, key: number): Promise<string> {
  const { sr, signerId } = signerOf(r, key);
  const s = await ys<YsSigner>('GET', `/signature_requests/${sr}/signers/${signerId}`);
  if (!s.signature_link) throw fail('El enlace de firma no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.', 'link_unavailable', 409);
  return embedLink(s.signature_link, ysConfig().sandbox);
}

export const yousignProvider: SignatureProvider = {
  id: 'yousign',

  async resolveOwner(uid) {
    const [u, auth] = await Promise.all([db().collection('users').doc(uid).get(), authAdmin().getUser(uid).catch(() => null)]);
    const email = (auth?.email ?? (u.get('email') as string | undefined) ?? '').trim();
    if (!email) throw fail('Tu cuenta no tiene email: no podemos enviarte a firmar.', 'no_email', 409);
    const name = String(u.get('displayName') || u.get('name') || auth?.displayName || email).trim();
    return { name, email };
  },

  async createAndSend(c) {
    const cfg = ysConfig();
    const lang = c.options.language;
    // 1) The signing PDF (text layer + field boxes per signer, owner = block 1).
    const markdown = c.markdown ?? htmlToSigningMarkdown(c.html);
    const branding = await loadOwnerBranding(c.uid).catch(() => null);
    const pdf = await renderSigningPdf(markdown, { title: c.title, authorName: c.meta?.authorName, authorNif: c.meta?.authorNif, branding, language: lang });
    const parties = [{ name: c.owner.name, email: c.owner.email, key: 1, otp: false }, ...c.signers.map((p, i) => ({ name: p.name, email: p.email, key: i + 2, otp: !!p.accessCode }))];
    for (const p of parties) {
      if (!pdf.fields.some(f => f.kind === 'signature' && f.signer === p.key)) throw fail('El documento no tiene un bloque de firma para cada firmante.', 'missing_signature_block', 422);
    }

    // 2) Request (draft) → document → signers with fields → activate.
    const expiresAt = expirationDate(new Date(), c.options.expireAfterDays);
    const req = await ys<YsRequest>('POST', '/signature_requests', {
      name: c.title.slice(0, 128) || 'Documento',
      delivery_mode: 'none',
      ordered_signers: c.signingOrder !== 'parallel',
      signers_allowed_to_decline: true,
      expiration_date: expiresAt,
      timezone: 'Europe/Madrid',
      audit_trail_locale: lang,
      external_id: c.requestId,
    });
    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(pdf.pdf)], { type: 'application/pdf' }), `${(c.title || 'Documento').replace(/[^\w\- ]+/g, '').slice(0, 60) || 'Documento'}.pdf`);
      form.append('nature', 'signable_document');
      const doc = await ys<YsDocument>('POST', `/signature_requests/${req.id}/documents`, form);
      const signers: { recipientKey: number; signerId: string }[] = [];
      for (const p of parties) {
        const boxes = pdf.fields.filter(f => f.kind === 'signature' && f.signer === p.key);
        const s = await ys<YsSigner>('POST', `/signature_requests/${req.id}/signers`, {
          info: { ...splitName(p.name), email: p.email, locale: lang },
          signature_level: 'electronic_signature',
          signature_authentication_mode: p.otp ? 'otp_email' : 'no_otp',
          fields: boxes.map(b => ({ document_id: doc.id, type: 'signature', page: b.page, x: b.x, y: b.y, width: b.width, height: b.height })),
        });
        signers.push({ recipientKey: p.key, signerId: s.id });
      }
      await ys('POST', `/signature_requests/${req.id}/activate`);
      return { yousign: { signatureRequestId: req.id, documentId: doc.id, signers }, expiresAt, signatureLevel: 'ses' as const };
    } catch (err) {
      await ys('DELETE', `/signature_requests/${req.id}`).catch(() => {});   // draft: never leave it behind
      void cfg;
      throw err;
    }
  },

  async abandon(_uid, refs, reason) {
    const id = refs.yousign?.signatureRequestId;
    if (!id) return;
    await ys('POST', `/signature_requests/${id}/cancel`, { reason: 'contractualization_aborted', custom_note: reason.slice(0, 255) })
      .catch(() => ys('DELETE', `/signature_requests/${id}`));
  },

  async ownerSigningSession(r) {
    return { signingUrl: await freshSigningLink(r, 1), focused: null, yousign: { embedded: true } };
  },

  async remind(r) {
    // Avocat delivers Yousign links: a reminder is our email again, with a fresh /firma link.
    await sendSignerInvites(r.id, { reminder: true });
  },

  async updateSignerEmail() {
    // Not possible on an activated request: cancel + send a new version (the sheet says so).
    return 'recreate_required';
  },

  async void(r, reason) {
    if (!r.yousign) return;
    await ys('POST', `/signature_requests/${r.yousign.signatureRequestId}/cancel`, { reason: 'contractualization_aborted', custom_note: reason.slice(0, 255) });
  },

  async fetchStatus(r) {
    const s = await ys<YsRequest>('GET', `/signature_requests/${r.yousign!.signatureRequestId}`);
    return summaryFromYousignState(r, s);
  },

  async downloadSigned(r) {
    const sr = r.yousign!.signatureRequestId;
    // [spike Y0: path + format; one signable document → a PDF]
    const signed = await ysBinary(`/signature_requests/${sr}/documents/download`);
    if (!/pdf/i.test(signed.contentType) && signed.bytes.subarray(0, 4).toString() !== '%PDF') {
      throw fail('Yousign devolvió el documento firmado en un formato inesperado.', 'unexpected_format', 502);
    }
    const auditTrails: { recipientKey: number; pdf: Buffer }[] = [];
    for (const s of r.yousign!.signers) {
      const rec = r.recipients.find(x => recipientKey(x) === s.recipientKey);
      if (!rec || rec.role === 'cc') continue;
      const a = await ysBinary(`/signature_requests/${sr}/signers/${s.signerId}/audit_trails/download`);
      auditTrails.push({ recipientKey: s.recipientKey, pdf: a.bytes });
    }
    return { signedPdf: signed.bytes, auditTrails };
  },
};
