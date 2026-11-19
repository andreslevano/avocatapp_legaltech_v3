// NDA negotiation — Admin SDK orchestration. Server-only.
//   negotiations/{id}            owner read-only (rules); every write goes through here
//   negotiations/{id}/versions/{n}  markdown in force at version n + what changed
//   negotiations/{id}/events/{auto} audit log
//   documents/{id}.negotiation   { id, status, role } on the draft and the final document (server-only field)
// Link tokens: same pattern as data requests (token.ts): only hashes are stored. Each round's email
// carries a fresh link and the earlier ones keep working (tokenHashes) until the negotiation closes;
// "Reenviar" rotates (only the new link works).

import { db } from '@/lib/firebase-admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import { cleanValue, isValidEmail } from '@/lib/data-requests/core';
import { hashToken, newToken } from '@/lib/data-requests/token';
import { DataRequestError as NegotiationError, ownerName, type Caller } from '@/lib/data-requests/server';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { signatureTitleFromName } from '@/lib/signatures/eligibility';
import { assemble, splitClauses } from './clauses';
import { defaultLevel, isClauseLevel, levelAllows, MFW_PLAYBOOK, type ClauseLevel } from './levels';
import { applyOwnerResponse, applyThirdParty, awaitsOwner, effectiveStatus, expiryFrom, linkShowsClauses, linkState, type LinkState } from './rules';
import { counterpartyEmail, negotiationNotification, negotiationUrl, ownerEmail, type NegotiationEvent as NotifEvent } from './emails';
import type { Counterparty, NegClause, Negotiation, NegotiationEvent, NegotiationStatus, Party } from './types';

export { NegotiationError };

const MARKDOWN_MAX = 200_000;
const negotiations = () => db().collection('negotiations');
const documents = () => db().collection('documents');
const nowIso = () => new Date().toISOString();
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, '');
export const publicLink = (token: string) => `${appUrl()}/negociacion/${token}`;

type Stored = Omit<Negotiation, 'id'>;

async function loadOwned(uid: string, id: string): Promise<Negotiation> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new NegotiationError('Negociación no encontrada.', 'not_found', 404);
  const snap = await negotiations().doc(id).get();
  if (!snap.exists || snap.get('ownerId') !== uid) throw new NegotiationError('Negociación no encontrada.', 'not_found', 404);
  return { id: snap.id, ...(snap.data() as Stored) };
}

export const agreedMarkdown = (n: Pick<Negotiation, 'preamble' | 'tail' | 'clauses'>) =>
  assemble({ preamble: n.preamble, tail: n.tail, clauses: n.clauses.map(c => ({ key: c.key, n: c.n, heading: c.heading, text: c.current })) });

const companyOf = (n: Pick<Negotiation, 'counterparty' | 'title'>) => n.counterparty.company || n.title;

function event(id: string, e: Omit<NegotiationEvent, 'at'> & { at?: string; counts?: Record<string, number> }) {
  return negotiations().doc(id).collection('events').doc().set({ at: nowIso(), ...e });
}

/** documents/{id}.negotiation on the draft (and the final document once there is one). */
async function syncDocuments(n: Pick<Negotiation, 'id' | 'draftDocumentId' | 'finalDocumentId'>, status: NegotiationStatus) {
  await Promise.all([
    documents().doc(n.draftDocumentId).update({ negotiation: { id: n.id, status, role: 'draft' } }),
    n.finalDocumentId ? documents().doc(n.finalDocumentId).update({ negotiation: { id: n.id, status, role: 'final' } }) : null,
  ]).catch(err => console.warn('[negotiations] sync documents', (err as Error).message));
}

function notificationDoc(ownerId: string, notif: ReturnType<typeof negotiationNotification>, at: string) {
  return {
    userId: ownerId, ...notif, dueDate: at.slice(0, 10),
    // The owner gets their own email; keep it out of the contract-alerts digest.
    emailed: true, readAt: null, createdAt: at,
  };
}

async function emailCounterparty(n: Negotiation, token: string, changes?: number): Promise<boolean> {
  if (!emailConfigured()) return false;
  const owner = await ownerName(n.ownerId);
  const msg = counterpartyEmail({
    ownerCompany: n.ownerCompany, ownerName: owner.name, ownerEmail: owner.email, counterpartyName: n.counterparty.name,
    title: n.title, round: n.round, link: publicLink(token), expiresAt: n.expiresAt, changes,
  });
  try {
    await sendEmail(n.counterparty.email, { ...msg, ...(owner.email ? { replyTo: owner.email } : {}) });
    return true;
  } catch (err) {
    console.warn('[negotiations] counterparty email', (err as Error).message);
    return false;
  }
}

export interface SentResult { id: string; status: NegotiationStatus; emailed: boolean; emailConfigured: boolean; link?: string }

const sent = (id: string, status: NegotiationStatus, emailed: boolean, token: string): SentResult => ({
  id, status, emailed, emailConfigured: emailConfigured(),
  // The link is returned only when the email couldn't go out (the owner sends it by other means).
  ...(emailed ? {} : { link: publicLink(token) }),
});

// ── Owner actions ───────────────────────────────────────────────────

export async function createNegotiation(caller: Caller, body: Record<string, unknown>): Promise<SentResult> {
  if (orgNdaTemplateFor({ email: caller.email, emailVerified: caller.emailVerified }) !== 'mobilityforwork') {
    throw new NegotiationError('La negociación solo está disponible para la plantilla de NDA de tu organización.', 'forbidden', 403);
  }
  const playbook = MFW_PLAYBOOK;
  const draftId = typeof body.draftDocumentId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.draftDocumentId) ? body.draftDocumentId : '';
  if (!draftId) throw new NegotiationError('Falta el borrador.', 'invalid_input', 400);
  const markdown = typeof body.markdown === 'string' ? body.markdown : '';
  if (!markdown || markdown.length > MARKDOWN_MAX) throw new NegotiationError('El borrador no es válido.', 'invalid_input', 400);
  const split = splitClauses(markdown, playbook.clauseCount);
  if (!split.ok) throw new NegotiationError(`No se pudo dividir el NDA en cláusulas: ${split.error}`, 'invalid_markdown', 422);

  const cp = (body.counterparty && typeof body.counterparty === 'object' ? body.counterparty : {}) as Record<string, unknown>;
  const counterparty: Counterparty = {
    name: cleanValue(cp.name, 120),
    email: cleanValue(cp.email, 254).toLowerCase(),
    ...(cleanValue(cp.company, 160) ? { company: cleanValue(cp.company, 160) } : {}),
  };
  if (!counterparty.name) throw new NegotiationError('Indica el nombre de quien revisará el NDA.', 'invalid_input', 400);
  if (!isValidEmail(counterparty.email)) throw new NegotiationError('Revisa el email de quien revisará el NDA.', 'invalid_input', 400);
  if (caller.email && counterparty.email === caller.email.toLowerCase()) throw new NegotiationError('Envíalo a la otra parte, no a tu propio email.', 'invalid_input', 400);

  const draftRef = documents().doc(draftId);
  const draft = await draftRef.get();
  if (!draft.exists || draft.get('userId') !== caller.uid) throw new NegotiationError('Borrador no encontrado.', 'not_found', 404);
  if (draft.get('negotiation')) throw new NegotiationError('Este borrador ya está en negociación.', 'already_negotiating', 409);
  if (draft.get('signatureStatus') || draft.get('kind') === 'signed') throw new NegotiationError('Este documento ya se envió a firmar.', 'already_signing', 409);

  let clientId: string | null = null;
  if (typeof body.clientId === 'string' && body.clientId) {
    const c = await db().collection('clients').doc(body.clientId).get();
    if (!c.exists || c.get('userId') !== caller.uid) throw new NegotiationError('Cliente no encontrado.', 'not_found', 404);
    clientId = c.id;
  }

  const levels = (body.levels && typeof body.levels === 'object' ? body.levels : {}) as Record<string, unknown>;
  const clauses: NegClause[] = split.clauses.map(c => {
    const level: ClauseLevel = isClauseLevel(levels[c.key]) ? levels[c.key] as ClauseLevel : defaultLevel(playbook, c.n);
    return { key: c.key, n: c.n, heading: c.heading, level, original: c.text, current: c.text, state: 'pendiente', proposal: null, ownerDecision: null, comments: [] };
  });

  const { token, tokenHash } = newToken();
  const at = nowIso();
  const ref = negotiations().doc();
  const n: Negotiation = {
    id: ref.id, ownerId: caller.uid, orgId: null, clientId,
    templateId: playbook.templateId, templateVersion: playbook.templateVersion, ownerCompany: playbook.company,
    title: signatureTitleFromName(String(draft.get('name') ?? 'NDA')),
    draftDocumentId: draftId, finalDocumentId: null, counterparty, showLevels: body.showLevels !== false,
    status: 'en_revision', turn: 'tercero', round: 1, version: 1,
    tokenHash, tokenHashes: [tokenHash], expiresAt: expiryFrom(new Date()), lastSentAt: at, sentCount: 1,
    openedAt: null, submittedAt: null, agreedAt: null, expiringNotifiedAt: null,
    preamble: split.preamble, tail: split.tail, clauses, createdAt: at, updatedAt: at,
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...data } = n;
  const batch = db().batch();
  batch.set(ref, data);
  batch.set(ref.collection('versions').doc('1'), {
    n: 1, round: 1, by: 'propietario', markdown: agreedMarkdown(n),
    summary: { accepted: 0, proposals: 0, comments: 0, decisions: 0, changed: [] }, createdAt: at,
  });
  batch.set(ref.collection('events').doc(), { type: 'created', by: 'propietario', at, round: 1 });
  batch.update(draftRef, {
    negotiation: { id: ref.id, status: 'en_revision', role: 'draft' }, status: 'Borrador',
    ...(clientId && !draft.get('clientId') ? { clientId } : {}),
  });
  await batch.commit();
  const emailed = await emailCounterparty(n, token);
  await event(ref.id, { type: 'sent', by: 'propietario', round: 1, detail: emailed ? 'email' : 'enlace' });
  return sent(ref.id, 'en_revision', emailed, token);
}

/** "Enviar respuesta · ronda N": the owner's decisions; new round for the other party. */
export async function respondNegotiation(uid: string, id: string, body: Record<string, unknown>): Promise<SentResult & { round: number }> {
  await loadOwned(uid, id);
  const { token, tokenHash } = newToken();
  const at = nowIso();
  const ref = negotiations().doc(id);
  const result = await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const n = { id: snap.id, ...(snap.data() as Stored) };
    const out = applyOwnerResponse(n, body, at);
    if (!out.ok) return out;
    const version = out.changed.length ? n.version + 1 : n.version;
    const next: Negotiation = {
      ...n, clauses: out.clauses, status: out.status, turn: out.turn, round: n.round + 1, version,
      tokenHash, tokenHashes: [...(n.tokenHashes ?? []), tokenHash].slice(-20),
      expiresAt: expiryFrom(new Date(at)), lastSentAt: at, sentCount: (n.sentCount ?? 0) + 1, expiringNotifiedAt: null, updatedAt: at,
    };
    tx.update(ref, {
      clauses: next.clauses, status: next.status, turn: next.turn, round: next.round, version: next.version,
      tokenHash, tokenHashes: next.tokenHashes, expiresAt: next.expiresAt, lastSentAt: at, sentCount: next.sentCount,
      expiringNotifiedAt: null, updatedAt: at,
    });
    if (version !== n.version) {
      tx.set(ref.collection('versions').doc(String(version)), {
        n: version, round: n.round, by: 'propietario', markdown: agreedMarkdown(next),
        summary: { accepted: 0, proposals: 0, comments: out.counts.replies, decisions: out.counts.decisions, changed: out.changed }, createdAt: at,
      });
    }
    tx.set(ref.collection('events').doc(), {
      type: 'responded', by: 'propietario', at, round: n.round,
      counts: { decisions: out.counts.decisions, replies: out.counts.replies, changed: out.changed.length },
    });
    return { ok: true as const, next, changed: out.changed.length };
  });
  if (!result.ok) throw new NegotiationError(result.error, result.code === 'turn' ? 'turn' : 'invalid_input', result.code === 'turn' ? 409 : 422);
  await syncDocuments(result.next, result.next.status);
  const emailed = await emailCounterparty(result.next, token, result.changed);
  return { ...sent(id, result.next.status, emailed, token), round: result.next.round };
}

/** The agreed markdown, for the browser to build the final Word/PDF (no BORRADOR mark). */
export async function finalizeNegotiation(uid: string, id: string): Promise<{ markdown: string; title: string; version: number }> {
  const n = await loadOwned(uid, id);
  if (n.status !== 'acordado') throw new NegotiationError('La negociación aún no está acordada.', 'not_agreed', 409);
  return { markdown: agreedMarkdown(n), title: n.title, version: n.version };
}

/** The page saved the final document: link it to the negotiation. */
export async function linkFinalDocument(uid: string, id: string, body: Record<string, unknown>) {
  const n = await loadOwned(uid, id);
  if (n.status !== 'acordado') throw new NegotiationError('La negociación aún no está acordada.', 'not_agreed', 409);
  const documentId = typeof body.documentId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.documentId) ? body.documentId : '';
  const d = documentId ? await documents().doc(documentId).get() : null;
  if (!d?.exists || d.get('userId') !== uid) throw new NegotiationError('Documento no encontrado.', 'not_found', 404);
  if (documentId === n.draftDocumentId) throw new NegotiationError('Ese es el borrador, no la versión acordada.', 'invalid_input', 400);
  const at = nowIso();
  await Promise.all([
    negotiations().doc(id).update({ finalDocumentId: documentId, updatedAt: at }),
    d.ref.update({
      negotiation: { id, status: 'acordado', role: 'final' },
      ...(n.clientId && !d.get('clientId') ? { clientId: n.clientId } : {}),
    }),
    event(id, { type: 'finalized', by: 'propietario', round: n.round, detail: documentId }),
  ]);
  return { id, finalDocumentId: documentId };
}

/** New link (rotated: earlier ones stop working), new 14-day expiry, email again. */
export async function resendNegotiation(uid: string, id: string): Promise<SentResult> {
  const n = await loadOwned(uid, id);
  const s = effectiveStatus(n);
  if (s !== 'en_revision' && s !== 'caducada') throw new NegotiationError('Solo se reenvía mientras la otra parte tiene el turno.', 'not_their_turn', 409);
  const { token, tokenHash } = newToken();
  const at = nowIso();
  const next: Negotiation = { ...n, status: 'en_revision', tokenHash, tokenHashes: [tokenHash], expiresAt: expiryFrom(new Date()), lastSentAt: at, sentCount: (n.sentCount ?? 0) + 1, updatedAt: at };
  await negotiations().doc(id).update({
    status: 'en_revision', tokenHash, tokenHashes: [tokenHash], expiresAt: next.expiresAt, lastSentAt: at,
    sentCount: next.sentCount, expiringNotifiedAt: null, updatedAt: at,
  });
  const emailed = await emailCounterparty(next, token);
  await event(id, { type: 'resent', by: 'propietario', round: n.round, detail: emailed ? 'email' : 'enlace' });
  return sent(id, 'en_revision', emailed, token);
}

export async function revokeNegotiation(uid: string, id: string): Promise<{ id: string; status: NegotiationStatus }> {
  const n = await loadOwned(uid, id);
  if (n.status === 'acordado' || n.status === 'revocada' || n.status === 'cerrada') {
    throw new NegotiationError('Esta negociación ya está cerrada.', 'closed', 409);
  }
  await negotiations().doc(id).update({ status: 'revocada', turn: null, tokenHash: null, tokenHashes: [], updatedAt: nowIso() });
  await syncDocuments(n, 'revocada');
  await event(id, { type: 'revoked', by: 'propietario', round: n.round });
  return { id, status: 'revocada' };
}

// ── Public (token) ──────────────────────────────────────────────────

async function findByToken(token: string): Promise<Negotiation | null> {
  const q = await negotiations().where('tokenHashes', 'array-contains', hashToken(token)).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...(q.docs[0].data() as Stored) };
}

export interface PublicClause {
  key: string; n: number; heading: string; text: string; state: NegClause['state'];
  /** Only when the owner shows the levels. */
  level?: ClauseLevel;
  /** What the clause allows (always sent: a no-modificable clause never offers "Propongo cambio"). */
  canPropose: boolean; reasonRequired: boolean;
  ownerDecision?: NegClause['ownerDecision']; comments: NegClause['comments'];
}

export type PublicView =
  | { status: 'invalida' }
  | { status: Exclude<LinkState, 'abierta'>; ownerCompany: string; title: string; round: number }
  | {
      status: 'abierta'; ownerCompany: string; title: string; round: number; version: number; expiresAt: string;
      counterpartyName: string; showLevels: boolean; clauses: PublicClause[];
    };

export async function getPublicView(token: string): Promise<PublicView> {
  const n = await findByToken(token);
  if (!n) return { status: 'invalida' };
  const state = linkState(n);
  const head = { ownerCompany: n.ownerCompany, title: n.title, round: n.round };
  if (!linkShowsClauses(state)) return { status: state as Exclude<LinkState, 'abierta'>, ...head };

  if (!n.openedAt) {
    const at = nowIso();
    const ref = negotiations().doc(n.id);
    const first = await db().runTransaction(async tx => {
      const s = await tx.get(ref);
      if (s.get('openedAt')) return false;
      tx.update(ref, { openedAt: at, updatedAt: at });
      tx.create(db().collection('notifications').doc(), notificationDoc(n.ownerId, negotiationNotification({
        event: 'opened', negotiationId: n.id, counterpartyName: n.counterparty.name, company: companyOf(n), round: n.round, version: n.version,
      }), at));
      tx.set(ref.collection('events').doc(), { type: 'opened', by: 'tercero', at, round: n.round });
      return true;
    }).catch(() => false);
    void first;
  }
  return {
    status: 'abierta', ...head, version: n.version, expiresAt: n.expiresAt, counterpartyName: n.counterparty.name, showLevels: n.showLevels,
    clauses: n.clauses.map(c => ({
      key: c.key, n: c.n, heading: c.heading, text: c.current, state: c.state, comments: c.comments,
      canPropose: levelAllows(c.level).propose, reasonRequired: levelAllows(c.level).reasonRequired,
      ...(n.showLevels ? { level: c.level } : {}),
      ...(c.ownerDecision ? { ownerDecision: c.ownerDecision } : {}),
    })),
  };
}

export type SubmitResult =
  | { ok: true; status: NegotiationStatus; ownerCompany: string }
  | { ok: false; status: 'invalida' | Exclude<LinkState, 'abierta'> }
  | { ok: false; status: 'invalid_input'; error: string; errors?: Record<string, string> };

export async function submitPublic(token: string, body: Record<string, unknown>): Promise<SubmitResult> {
  const hash = hashToken(token);
  const found = await findByToken(token);
  if (!found) return { ok: false, status: 'invalida' };
  const ref = negotiations().doc(found.id);
  const at = nowIso();

  const r = await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const n = { id: snap.id, ...(snap.data() as Stored) };
    if (!(n.tokenHashes ?? []).includes(hash)) return { kind: 'state' as const, status: 'invalida' as const };
    const state = linkState(n, new Date(at));
    if (state !== 'abierta') return { kind: 'state' as const, status: state };
    const out = applyThirdParty(n, body, at);
    if (!out.ok) return out.code === 'turn' ? { kind: 'state' as const, status: 'no_es_tu_turno' as const } : { kind: 'invalid' as const, out };
    const agreed = out.status === 'acordado';
    tx.update(ref, {
      clauses: out.clauses, status: out.status, turn: out.turn, submittedAt: at, updatedAt: at,
      ...(agreed ? { agreedAt: at } : {}),
    });
    const event: NotifEvent = agreed ? 'accepted' : 'submitted';
    const focus = out.clauses.find(awaitsOwner)?.key ?? null;
    tx.create(db().collection('notifications').doc(), notificationDoc(n.ownerId, negotiationNotification({
      event, negotiationId: n.id, counterpartyName: n.counterparty.name, company: companyOf(n), round: n.round, version: n.version,
      proposals: out.counts.proposals, comments: out.counts.comments, focus,
    }), at));
    tx.set(ref.collection('events').doc(), {
      type: agreed ? 'accepted' : 'submitted', by: 'tercero' satisfies Party, at, round: n.round,
      counts: { accepted: out.counts.accepted, proposals: out.counts.proposals, comments: out.counts.comments },
    });
    return { kind: 'ok' as const, n, out, event, focus };
  });

  if (r.kind === 'state') return { ok: false, status: r.status };
  if (r.kind === 'invalid') return { ok: false, status: 'invalid_input', error: r.out.error, errors: r.out.errors };

  const { n, out, event, focus } = r;
  await syncDocuments(n, out.status);
  const owner = await ownerName(n.ownerId);
  if (owner.email && emailConfigured()) {
    const msg = ownerEmail({
      event: event === 'accepted' ? 'accepted' : 'submitted', counterpartyName: n.counterparty.name, company: companyOf(n), title: n.title,
      round: n.round, version: n.version, proposals: out.counts.proposals, comments: out.counts.comments,
      link: `${appUrl()}${negotiationUrl(n.id, focus)}`,
    });
    await sendEmail(owner.email, msg).catch(err => console.warn('[negotiations] owner email', (err as Error).message));
  }
  return { ok: true, status: out.status, ownerCompany: n.ownerCompany };
}

// ── Scheduled (contract-alerts cron) ────────────────────────────────

/** "El enlace caduca en 2 días": once per link, while it's the other party's turn. */
export async function runNegotiationExpiryScan(now: Date = new Date()): Promise<{ checked: number; notified: number }> {
  const q = await negotiations().where('status', '==', 'en_revision').get();
  const soon = new Date(now.getTime() + 2 * 86_400_000).toISOString();
  const nowS = now.toISOString();
  let notified = 0;
  for (const d of q.docs) {
    const n = { id: d.id, ...(d.data() as Stored) };
    if (n.turn !== 'tercero' || n.expiresAt <= nowS || n.expiresAt > soon || n.expiringNotifiedAt) continue;
    const at = nowIso();
    const batch = db().batch();
    batch.update(d.ref, { expiringNotifiedAt: at });
    batch.create(db().collection('notifications').doc(), notificationDoc(n.ownerId, negotiationNotification({
      event: 'expiring', negotiationId: n.id, counterpartyName: n.counterparty.name, company: companyOf(n), round: n.round, version: n.version,
    }), at));
    await batch.commit().then(() => { notified++; }).catch(err => console.warn('[negotiations] expiring', (err as Error).message));
  }
  return { checked: q.size, notified };
}
