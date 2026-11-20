// Counterparty signing links (Yousign path, plan §6). Yousign signing links expire after 48 h and
// are credentials, so the email never carries one: it links to Avocat's /firma/{token}, which asks
// Yousign for a fresh link when opened. Tokens: hashed (data-requests token helpers), one per email
// sent, valid while the request is active. Server-only.

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import { hashToken, isTokenShape, newToken } from '@/lib/data-requests/token';
import { ownerName } from '@/lib/data-requests/server';
import { signerInviteEmail } from './invite-email';
import { recipientKey } from './recipients';
import { isActiveStatus, type SignatureRecipient, type SignatureRequest } from './types';

const invites = () => db().collection('signature_invites');
const requests = () => db().collection('signature_requests');
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, '');

export const inviteLink = (token: string) => `${appUrl()}/firma/${token}`;

async function newInvite(r: SignatureRequest, c: SignatureRecipient): Promise<string> {
  const { token, tokenHash } = newToken();
  await invites().doc(tokenHash).set({
    requestId: r.id, userId: r.userId, recipientKey: recipientKey(c), email: c.email.toLowerCase(), createdAt: new Date().toISOString(),
  });
  return token;
}

/** Whose turn it is and hasn't been emailed yet (or, for a reminder, everyone still pending). */
export function recipientsToInvite(r: Pick<SignatureRequest, 'recipients' | 'status'>, reminder: boolean): SignatureRecipient[] {
  if (r.status !== 'sent' && r.status !== 'delivered') return [];
  return r.recipients.filter(x => x.role === 'signer' && (x.status === 'sent' || x.status === 'delivered') && (reminder || !x.invitedAt));
}

/**
 * Emails each counterparty whose turn has come (first time), or a reminder to everyone pending.
 * Marks invitedAt so a webhook retry or a second trigger doesn't email twice. Returns who was emailed.
 */
export async function sendSignerInvites(requestId: string, opts: { reminder?: boolean } = {}): Promise<string[]> {
  const snap = await requests().doc(requestId).get();
  if (!snap.exists) return [];
  const r = { id: snap.id, ...(snap.data() as Omit<SignatureRequest, 'id'>) };
  if (r.provider !== 'yousign') return [];
  const targets = recipientsToInvite(r, !!opts.reminder);
  if (!targets.length) return [];
  if (!emailConfigured()) throw new Error('El envío de emails no está configurado.');

  // Claim them first (transaction): a concurrent trigger sees invitedAt and skips.
  const at = new Date().toISOString();
  const claimed = opts.reminder ? targets : await db().runTransaction(async tx => {
    const cur = await tx.get(requests().doc(requestId));
    const recs = (cur.get('recipients') as SignatureRecipient[]) ?? [];
    const keys = new Set(targets.map(recipientKey));
    const free = recs.filter(x => keys.has(recipientKey(x)) && !x.invitedAt);
    if (!free.length) return [];
    const freeKeys = new Set(free.map(recipientKey));
    tx.update(requests().doc(requestId), { recipients: recs.map(x => (freeKeys.has(recipientKey(x)) ? { ...x, invitedAt: at } : x)) });
    return free;
  });

  const owner = await ownerName(r.userId);
  const sent: string[] = [];
  for (const c of claimed) {
    try {
      const token = await newInvite(r, c);
      const msg = signerInviteEmail({
        ownerName: owner.name, ownerEmail: owner.email, signerName: c.name, title: r.subject.replace(/^Firma solicitada:\s*/i, '') || 'Documento',
        message: r.message, link: inviteLink(token), language: r.options?.language ?? 'es', reminder: !!opts.reminder,
        expiresAt: r.expiresAt ?? null,
      });
      await sendEmail(c.email, { ...msg, ...(owner.email ? { replyTo: owner.email } : {}) });
      sent.push(c.email);
    } catch (err) {
      console.error('[signatures] invite email', r.id, (err as Error).message);
      if (!opts.reminder) {
        // Not emailed: release the claim so the next trigger (or "Recordar") retries.
        await db().runTransaction(async tx => {
          const cur = await tx.get(requests().doc(requestId));
          const recs = (cur.get('recipients') as SignatureRecipient[]) ?? [];
          tx.update(requests().doc(requestId), { recipients: recs.map(x => (recipientKey(x) === recipientKey(c) ? { ...x, invitedAt: FieldValue.delete() as unknown as string } : x)) });
        }).catch(() => {});
      }
    }
  }
  if (sent.length) {
    await requests().doc(requestId).update({
      events: FieldValue.arrayUnion(...sent.map(email => ({ type: opts.reminder ? 'reminded' : 'invited', at, by: email }))),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return sent;
}

export type InviteState =
  | { state: 'invalid' }
  | { state: 'signed' | 'voided' | 'expired' | 'declined' | 'not_your_turn'; ownerName: string; title: string }
  | { state: 'open'; ownerName: string; title: string; signerName: string; requestId: string; recipientKey: number; sandbox?: boolean };

/** /firma/{token}: who is signing what, and whether they can sign now. */
export async function resolveInvite(token: string): Promise<InviteState & { request?: SignatureRequest }> {
  if (!isTokenShape(token)) return { state: 'invalid' };
  const inv = await invites().doc(hashToken(token)).get();
  if (!inv.exists) return { state: 'invalid' };
  const snap = await requests().doc(inv.get('requestId') as string).get();
  if (!snap.exists) return { state: 'invalid' };
  const r = { id: snap.id, ...(snap.data() as Omit<SignatureRequest, 'id'>) };
  const key = inv.get('recipientKey') as number;
  const c = r.recipients.find(x => recipientKey(x) === key);
  // A corrected email or a replaced signer invalidates links sent to the old address.
  if (!c || c.email.toLowerCase() !== String(inv.get('email'))) return { state: 'invalid' };
  const owner = await ownerName(r.userId);
  const title = r.subject.replace(/^Firma solicitada:\s*/i, '') || 'Documento';
  const base = { ownerName: owner.name, title };
  if (c.status === 'completed' || r.status === 'completed') return { state: 'signed', ...base };
  if (r.status === 'voided') return { state: 'voided', ...base };
  if (r.status === 'expired') return { state: 'expired', ...base };
  if (r.status === 'declined' || c.status === 'declined') return { state: 'declined', ...base };
  if (!isActiveStatus(r.status) || (c.status !== 'sent' && c.status !== 'delivered')) return { state: 'not_your_turn', ...base };
  return { state: 'open', ...base, signerName: c.name, requestId: r.id, recipientKey: key, request: r };
}
