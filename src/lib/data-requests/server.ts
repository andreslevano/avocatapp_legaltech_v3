// "Solicitar datos al cliente" — Admin SDK orchestration. Server-only.
//   data_requests/{id} — owner read-only (rules); every write goes through here.
//   clients/{id}.dataRequest — denormalized summary for the clients list.
// The raw link token is never stored: only its SHA-256 hash (token.ts).

import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import {
  availableDocs, asksPersonType, docById, documentsPhrase, fieldsFor, labelFor, isDocId,
  type DataRequestStatus, type DocId, type FieldKey,
} from './catalog';
import { effectiveStatus, expiryFrom, isValidEmail, linkUsable, submissionToClient, validateSubmission, type SubmissionResult } from './core';
import { hashToken, newToken } from './token';
import { clientRequestEmail, ownerCompletedEmail } from './emails';

export class DataRequestError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

export interface DataRequest {
  id: string;
  ownerId: string;
  orgId: null;
  clientId: string;
  clientName: string;
  clientEmail: string;
  documents: DocId[];
  fields: FieldKey[];
  tokenHash: string | null;
  /** Hash of the token that completed the request (so the used link says "ya enviados"). */
  usedTokenHash?: string | null;
  expiresAt: string;
  status: DataRequestStatus;
  sentCount: number;
  lastSentAt: string;
  openedAt?: string | null;
  submittedAt?: string | null;
  documentIds?: Partial<Record<DocId, string>>;
  createdAt: string;
  updatedAt: string;
}

const requests = () => db().collection('data_requests');
const clients = () => db().collection('clients');
const nowIso = () => new Date().toISOString();
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, '');
export const publicLink = (token: string) => `${appUrl()}/solicitud/${token}`;

// ── Auth ────────────────────────────────────────────────────────────

export interface Caller { uid: string; email?: string; emailVerified: boolean }

/** Verifies the Firebase ID token (Bearer). Returns the caller or an error response. */
export async function requireCaller(req: NextRequest): Promise<Caller | NextResponse> {
  const h = req.headers.get('Authorization') ?? '';
  const idToken = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const t = await authAdmin().verifyIdToken(idToken);
    return { uid: t.uid, email: t.email, emailVerified: t.email_verified === true };
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof DataRequestError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  console.error('[data-requests]', (err as Error)?.message ?? err);
  return NextResponse.json({ error: 'No se pudo completar la acción.', code: 'error' }, { status: 500 });
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

// ── Helpers ─────────────────────────────────────────────────────────

async function ownerName(uid: string): Promise<{ name: string; email: string | null }> {
  const u = (await db().collection('users').doc(uid).get()).data() ?? {};
  const auth = await authAdmin().getUser(uid).catch(() => null);
  const email = (auth?.email ?? (u.email as string | undefined)) || null;
  const name = ((u.displayName as string) || (u.name as string) || auth?.displayName || email || 'Tu abogado').trim();
  return { name, email };
}

async function loadOwned(uid: string, id: string): Promise<DataRequest> {
  const snap = await requests().doc(id).get();
  if (!snap.exists || snap.get('ownerId') !== uid) throw new DataRequestError('Solicitud no encontrada.', 'not_found', 404);
  return { id: snap.id, ...(snap.data() as Omit<DataRequest, 'id'>) };
}

function summary(r: Pick<DataRequest, 'id' | 'status' | 'documents' | 'expiresAt'>) {
  return { id: r.id, status: r.status, documents: r.documents, expiresAt: r.expiresAt, updatedAt: nowIso() };
}

async function emailClient(r: DataRequest, token: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const owner = await ownerName(r.ownerId);
  const msg = clientRequestEmail({
    ownerName: owner.name, clientName: r.clientName, documents: documentsPhrase(r.documents),
    link: publicLink(token), expiresAt: r.expiresAt,
  });
  try {
    await sendEmail(r.clientEmail, { ...msg, ...(owner.email ? { replyTo: owner.email } : {}) });
    return true;
  } catch (err) {
    console.warn('[data-requests] client email', (err as Error).message);
    return false;
  }
}

export interface SentResult { id: string; status: DataRequestStatus; link: string; emailed: boolean; emailConfigured: boolean }

// ── Owner actions ───────────────────────────────────────────────────

export async function createDataRequest(caller: Caller, input: { clientId?: unknown; documents?: unknown }): Promise<SentResult> {
  if (typeof input.clientId !== 'string' || !input.clientId) throw new DataRequestError('Falta el cliente.', 'invalid_input', 400);
  const docs = Array.isArray(input.documents) ? [...new Set(input.documents.filter(isDocId))] : [];
  if (docs.length === 0) throw new DataRequestError('Elige al menos un documento.', 'invalid_input', 400);
  const allowed = new Set(availableDocs({ email: caller.email, emailVerified: caller.emailVerified }).map(d => d.id));
  if (docs.some(d => !allowed.has(d))) throw new DataRequestError('Ese documento no está disponible para tu cuenta.', 'forbidden_document', 403);

  const clientSnap = await clients().doc(input.clientId).get();
  if (!clientSnap.exists || clientSnap.get('userId') !== caller.uid) throw new DataRequestError('Cliente no encontrado.', 'not_found', 404);
  const clientEmail = String(clientSnap.get('email') ?? '').trim().toLowerCase();
  if (!isValidEmail(clientEmail)) throw new DataRequestError('El cliente necesita un email válido.', 'no_email', 422);

  // One open request per client: a new one replaces the previous.
  const prev = clientSnap.get('dataRequest') as { id?: string } | undefined;
  if (prev?.id) {
    await requests().doc(prev.id).get().then(s => {
      if (s.exists && s.get('ownerId') === caller.uid && ['enviada', 'abierta'].includes(s.get('status'))) {
        return s.ref.update({ status: 'revocada', tokenHash: null, updatedAt: nowIso() });
      }
    }).catch(() => {});
  }

  const { token, tokenHash } = newToken();
  const at = nowIso();
  const ref = requests().doc();
  const r: DataRequest = {
    id: ref.id, ownerId: caller.uid, orgId: null, clientId: clientSnap.id,
    clientName: String(clientSnap.get('name') ?? ''), clientEmail,
    documents: docs, fields: fieldsFor(docs), tokenHash, usedTokenHash: null,
    expiresAt: expiryFrom(new Date()), status: 'enviada', sentCount: 1, lastSentAt: at,
    openedAt: null, submittedAt: null, documentIds: {}, createdAt: at, updatedAt: at,
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...data } = r;
  await ref.set(data);
  await clientSnap.ref.update({ dataRequest: summary(r) });
  const emailed = await emailClient(r, token);
  return { id: r.id, status: r.status, link: publicLink(token), emailed, emailConfigured: emailConfigured() };
}

/** New token, new expiry, email again. Works from enviada / abierta / caducada / revocada. */
export async function resendDataRequest(uid: string, id: string): Promise<SentResult> {
  const r = await loadOwned(uid, id);
  if (r.status === 'completada') throw new DataRequestError('El cliente ya envió sus datos.', 'completed', 409);
  const { token, tokenHash } = newToken();
  const at = nowIso();
  const next: DataRequest = { ...r, tokenHash, expiresAt: expiryFrom(new Date()), status: 'enviada', sentCount: (r.sentCount ?? 0) + 1, lastSentAt: at, updatedAt: at };
  await requests().doc(id).update({
    tokenHash, expiresAt: next.expiresAt, status: 'enviada', sentCount: next.sentCount, lastSentAt: at, updatedAt: at,
  });
  await clients().doc(r.clientId).update({ dataRequest: summary(next) }).catch(() => {});
  const emailed = await emailClient(next, token);
  return { id, status: 'enviada', link: publicLink(token), emailed, emailConfigured: emailConfigured() };
}

export async function revokeDataRequest(uid: string, id: string): Promise<{ id: string; status: DataRequestStatus }> {
  const r = await loadOwned(uid, id);
  if (r.status === 'completada') throw new DataRequestError('El cliente ya envió sus datos.', 'completed', 409);
  await requests().doc(id).update({ status: 'revocada', updatedAt: nowIso() });
  await clients().doc(r.clientId).update({ dataRequest: summary({ ...r, status: 'revocada' }) }).catch(() => {});
  return { id, status: 'revocada' };
}

/** The tool saved a document prepared for this request: remember which one. */
export async function linkRequestDocument(uid: string, id: string, input: { docId?: unknown; documentId?: unknown }) {
  const r = await loadOwned(uid, id);
  if (!isDocId(input.docId) || !r.documents.includes(input.docId)) throw new DataRequestError('Documento no solicitado.', 'invalid_input', 400);
  if (typeof input.documentId !== 'string' || !input.documentId) throw new DataRequestError('Falta el documento.', 'invalid_input', 400);
  const d = await db().collection('documents').doc(input.documentId).get();
  if (!d.exists || d.get('userId') !== uid) throw new DataRequestError('Documento no encontrado.', 'not_found', 404);
  await requests().doc(id).update({ [`documentIds.${input.docId}`]: input.documentId, updatedAt: nowIso() });
  return { id, docId: input.docId, documentId: input.documentId };
}

// ── Public (token) ──────────────────────────────────────────────────

async function findByToken(token: string): Promise<DataRequest | null> {
  const hash = hashToken(token);
  for (const field of ['tokenHash', 'usedTokenHash'] as const) {
    const q = await requests().where(field, '==', hash).limit(1).get();
    if (!q.empty) return { id: q.docs[0].id, ...(q.docs[0].data() as Omit<DataRequest, 'id'>) };
  }
  return null;
}

export type PublicView =
  | { status: 'invalida' | 'caducada' | 'revocada' | 'completada'; ownerName?: string }
  | {
      status: 'enviada' | 'abierta';
      ownerName: string;
      documents: { id: DocId; label: string }[];
      askPersonType: boolean;
      fields: { key: FieldKey; label: string; help?: string; placeholder?: string; optional?: boolean }[];
      prefill: { name: string; email: string };
      expiresAt: string;
    };

/** What the public form may see: nothing beyond the owner's name, the documents and the fields. */
export async function getPublicView(token: string): Promise<PublicView> {
  const r = await findByToken(token);
  if (!r) return { status: 'invalida' };
  const status = effectiveStatus(r);
  if (r.usedTokenHash === hashToken(token) || status === 'completada') return { status: 'completada', ownerName: (await ownerName(r.ownerId)).name };
  if (status === 'caducada' || status === 'revocada') return { status, ownerName: (await ownerName(r.ownerId)).name };
  if (!r.openedAt) await requests().doc(r.id).update({ status: 'abierta', openedAt: nowIso(), updatedAt: nowIso() })
    .then(() => clients().doc(r.clientId).update({ dataRequest: summary({ ...r, status: 'abierta' }) }))
    .catch(() => {});
  return {
    status: r.openedAt ? status : 'abierta',
    ownerName: (await ownerName(r.ownerId)).name,
    documents: r.documents.map(id => ({ id, label: docById(id).label })),
    askPersonType: asksPersonType(r.documents),
    fields: fieldsFor(r.documents).filter(f => f !== 'personType').map(key => ({ key, ...labelFor(key) })),
    prefill: { name: r.clientName, email: r.clientEmail },
    expiresAt: r.expiresAt,
  };
}

export type SubmitResult =
  | { ok: true; ownerName: string; warnings: SubmissionResult['warnings'] }
  | { ok: false; status: 'invalida' | 'caducada' | 'revocada' | 'completada' }
  | { ok: false; status: 'invalid_input'; errors: Partial<Record<FieldKey | 'consent', string>> };

export async function submitPublic(token: string, body: Record<string, unknown>): Promise<SubmitResult> {
  const hash = hashToken(token);
  const found = await findByToken(token);
  if (!found) return { ok: false, status: 'invalida' };
  if (found.usedTokenHash === hash) return { ok: false, status: 'completada' };
  const state = effectiveStatus(found);
  if (state !== 'enviada' && state !== 'abierta') return { ok: false, status: state };

  const result = validateSubmission(found.documents, body);
  const errors: Partial<Record<FieldKey | 'consent', string>> = { ...result.errors };
  if (body.consent !== true) errors.consent = 'Acepta el aviso de privacidad para continuar.';
  if (Object.keys(errors).length) return { ok: false, status: 'invalid_input', errors };

  const at = nowIso();
  const reqRef = requests().doc(found.id);
  const outcome = await db().runTransaction(async tx => {
    const snap = await tx.get(reqRef);
    const r = { id: snap.id, ...(snap.data() as Omit<DataRequest, 'id'>) };
    if (r.tokenHash !== hash) return r.usedTokenHash === hash ? 'completada' : 'invalida';
    if (!linkUsable(r)) return effectiveStatus(r);
    const clientRef = clients().doc(r.clientId);
    const c = await tx.get(clientRef);
    if (!c.exists || c.get('userId') !== r.ownerId) return 'invalida';
    tx.update(clientRef, {
      ...submissionToClient(result),
      dataRequest: { ...summary({ ...r, status: 'completada' }), updatedAt: at },
      updatedAt: at,
    });
    tx.update(reqRef, { status: 'completada', submittedAt: at, tokenHash: null, usedTokenHash: hash, updatedAt: at });
    const notif = db().collection('notifications').doc();
    tx.create(notif, {
      userId: r.ownerId, type: 'data_request', requestId: r.id, clientId: r.clientId,
      title: `${result.values.name || r.clientName} ha completado sus datos`,
      body: `Ya puedes preparar: ${documentsPhrase(r.documents)}.`,
      url: '/clients', severity: 'low', dueDate: at.slice(0, 10),
      // The owner gets their own email below; keep it out of the contract-alerts digest.
      emailed: true, readAt: null, createdAt: at,
    });
    return 'ok' as const;
  });
  if (outcome !== 'ok') return { ok: false, status: outcome === 'enviada' || outcome === 'abierta' ? 'invalida' : outcome };

  const owner = await ownerName(found.ownerId);
  if (owner.email && emailConfigured()) {
    const msg = ownerCompletedEmail({ clientName: result.values.name || found.clientName, documents: documentsPhrase(found.documents), link: `${appUrl()}/clients` });
    await sendEmail(owner.email, msg).catch(err => console.warn('[data-requests] owner email', (err as Error).message));
  }
  return { ok: true, ownerName: owner.name, warnings: result.warnings };
}

