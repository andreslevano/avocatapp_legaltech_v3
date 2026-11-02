// signature_requests orchestration (Admin SDK). Server-only.
//   signature_requests/{id} — owner read-only (rules); all writes here.
//   documents/{id}          — signatureRequestId / signatureStatus / lockedAt / kind set here only (D11).

import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db, storage } from '@/lib/firebase-admin';
import { buildDocHtml, signingHtmlFromSaved, withSignatureBlocks, type DocMeta } from '@/lib/doc-html';
import { randomToken, sha256Base64Url } from '@/lib/integrations/crypto';
import { dsServerConfig } from '@/lib/docusign/config';
import { buildEnvelopeDefinition, webhookUrlFor } from '@/lib/docusign/envelope';
import {
  createEnvelope, createRecipientView, DocusignApiError, downloadCombinedPdf, getEnvelopeWithRecipients,
  updateSignerAndResend, voidEnvelope,
} from '@/lib/docusign/api';
import { getValidAccessToken } from '@/lib/docusign/tokens';
import {
  DEFAULT_SIGNATURE_OPTIONS, EMAIL_RE, isActiveStatus,
  type CreateSignatureInput, type SignatureRequest, type SignatureStatus,
} from './types';
import {
  deriveSync, refreshAvailableAt, REFRESH_WINDOW_MS, REMIND_WINDOW_MS, summaryFromConnect, type DsEnvelopeSummary,
} from './sync';
import { FILING_LEASE_MS, firebaseDownloadUrl, signedFileName, signedStoragePath } from './filing';
import { planRecipients, recipientKey } from './recipients';

const requests = () => db().collection('signature_requests');
const documents = () => db().collection('documents');
const now = () => new Date().toISOString();

const fail = (message: string, code: string, status: number) => new DocusignApiError(message, code, status);

function returnUrl(requestId: string): string {
  return `${dsServerConfig().appUrl}/signatures/return?rid=${encodeURIComponent(requestId)}`;
}

async function ownerMeta(uid: string): Promise<DocMeta> {
  const u = (await db().collection('users').doc(uid).get()).data() ?? {};
  const idNo = u.legalIdNumber as string | undefined;
  return {
    authorName: (u.legalCompanyName as string) || (u.displayName as string) || (u.name as string) || '',
    authorNif: idNo ? `${(u.legalIdType as string) || ''} ${idNo}`.trim() : undefined,
  };
}

async function loadOwnedRequest(uid: string, requestId: string): Promise<SignatureRequest> {
  const snap = await requests().doc(requestId).get();
  if (!snap.exists || snap.get('userId') !== uid) throw fail('Solicitud de firma no encontrada.', 'not_found', 404);
  return { id: snap.id, ...(snap.data() as Omit<SignatureRequest, 'id'>) };
}

const documentsBucket = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';

/** The saved .doc (Avocat's Word HTML) as text; '' when it isn't one (PDF, upload, too big). */
async function readSavedDoc(d: FirebaseFirestore.DocumentData): Promise<string> {
  const path = d.storagePath as string | undefined;
  if (d.type !== 'doc' || d.source === 'uploaded' || !path) return '';
  const file = storage().bucket(documentsBucket()).file(path);
  const [meta] = await file.getMetadata();
  if (Number(meta.size ?? 0) > 2_000_000) return '';
  const [buf] = await file.download();
  return buf.toString('utf8');
}

/**
 * POST /api/signatures — creates the envelope (owner = embedded signer 1, counterparty = remote
 * signer 2), stores the request, locks the document and returns the owner's signing URL.
 */
export async function startSignatureRequest(uid: string, input: CreateSignatureInput) {
  const docRef = documents().doc(input.documentId);
  const docSnap = await docRef.get();
  if (!docSnap.exists || docSnap.get('userId') !== uid) throw fail('Documento no encontrado.', 'not_found', 404);
  const existingId = docSnap.get('signatureRequestId') as string | undefined;
  const existingStatus = docSnap.get('signatureStatus') as SignatureStatus | undefined;
  if (existingId && isActiveStatus(existingStatus)) {
    const e = fail('Este documento ya está en proceso de firma.', 'already_in_signature', 409);
    (e as DocusignApiError & { requestId?: string }).requestId = existingId;
    throw e;
  }

  const creds = await getValidAccessToken(uid);
  if (!creds.userEmail) throw fail('Reconecta tu cuenta de DocuSign.', 'reconnect_required', 409);
  const owner = { name: creds.userName || creds.userEmail, email: creds.userEmail, clientUserId: uid };
  const options = { ...DEFAULT_SIGNATURE_OPTIONS, ...input.options };
  const signers = input.signers.map(p => ({ name: p.name.trim(), email: p.email.trim(), accessCode: p.accessCode || undefined }));
  const cc = (input.cc ?? []).map(p => ({ name: p.name.trim(), email: p.email.trim() }));
  const signingOrder = input.signingOrder ?? 'sequential';
  if ([...signers, ...cc].some(p => p.email.toLowerCase() === owner.email.toLowerCase())) {
    throw fail('Tú ya firmas el primero: no te añadas como firmante ni en copia.', 'invalid_email', 422);
  }

  // Missing "Firma:" blocks (owner = 1, then each signer) are appended at the end (Phase 5a/5b).
  const names = [owner.name, ...signers.map(p => p.name)];
  const html = input.markdown
    ? buildDocHtml(withSignatureBlocks(input.markdown, names, options.language), input.title, undefined, await ownerMeta(uid), { forSignature: true })
    : signingHtmlFromSaved(await readSavedDoc(docSnap.data() ?? {}), names, options.language);
  if (!html) {
    throw fail('Por ahora solo se pueden enviar a firma documentos generados en Avocat (Word). Los PDF y archivos subidos llegarán más adelante.', 'unsupported_format', 422);
  }

  const reqRef = requests().doc();
  const webhookToken = randomToken(32);
  const webhookUrl = webhookUrlFor(process.env.DOCUSIGN_WEBHOOK_BASE_URL, webhookToken);

  const { envelopeId } = await createEnvelope(creds, buildEnvelopeDefinition({
    html,
    documentName: input.title,
    subject: input.subject,
    message: input.message,
    owner,
    signers,
    cc,
    signingOrder,
    options,
    requestId: reqRef.id,
    webhookUrl,
  }));

  const at = now();
  const plan = planRecipients(signers.length, cc.length, signingOrder);
  const record: Omit<SignatureRequest, 'id'> = {
    userId: uid,
    documentId: input.documentId,
    caseId: (docSnap.get('caseId') as string | null) ?? null,
    clientId: (docSnap.get('clientId') as string | null) ?? null,
    provider: 'docusign',
    accountId: creds.accountId,
    envelopeId,
    status: 'pending_owner',
    recipients: [
      { role: 'owner', name: owner.name, email: owner.email, recipientId: 1, routingOrder: 1, status: 'sent' },
      ...signers.map((p, k) => ({
        role: 'signer' as const, name: p.name, email: p.email, ...plan.signers[k], status: 'created' as const,
        ...(p.accessCode ? { accessCode: true } : {}),
      })),
      ...cc.map((p, j) => ({ role: 'cc' as const, name: p.name || p.email, email: p.email, ...plan.cc[j], status: 'created' as const })),
    ],
    signingOrder,
    subject: input.subject.trim(),
    message: input.message.trim(),
    options,
    events: [{ type: 'created', at, by: owner.email }],
    webhookTokenHash: webhookUrl ? sha256Base64Url(webhookToken) : null,
  };

  try {
    const batch = db().batch();
    batch.set(reqRef, { ...record, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    batch.update(docRef, {
      signatureRequestId: reqRef.id,
      signatureStatus: 'pending_owner',
      lockedAt: FieldValue.serverTimestamp(),
      kind: 'original',
    });
    await batch.commit();
  } catch (err) {
    // Don't leave a live envelope Avocat doesn't know about.
    await voidEnvelope(creds, envelopeId, 'Error interno al registrar la solicitud').catch(() => {});
    throw err;
  }

  const { url } = await createRecipientView(creds, envelopeId, { ...owner, returnUrl: returnUrl(reqRef.id) });
  return { requestId: reqRef.id, signingUrl: url };
}

/** POST /api/signatures/[id]/signing-url — "Continuar firma" (fresh single-use view). */
export async function resumeOwnerSigning(uid: string, requestId: string) {
  const r = await loadOwnedRequest(uid, requestId);
  if (r.status !== 'pending_owner') throw fail('Ya no hay nada que firmar en esta solicitud.', 'not_pending', 409);
  const creds = await getValidAccessToken(uid);
  const owner = r.recipients.find(x => x.role === 'owner');
  if (!owner) throw fail('Solicitud de firma no válida.', 'invalid', 500);
  const { url } = await createRecipientView(creds, r.envelopeId, {
    name: owner.name, email: owner.email, clientUserId: uid, returnUrl: returnUrl(r.id),
  });
  return { signingUrl: url };
}

const docPatch = (status: SignatureStatus, unlock: boolean) =>
  unlock ? { signatureStatus: status, lockedAt: FieldValue.delete() } : { signatureStatus: status };

async function setStatus(r: SignatureRequest, status: SignatureStatus, patch: Partial<SignatureRequest>, event: string, unlock = false, by?: string) {
  await db().runTransaction(async tx => {
    const docRef = documents().doc(r.documentId);
    const docSnap = await tx.get(docRef);               // the document may have been deleted meanwhile
    tx.update(requests().doc(r.id), {
      ...patch,
      status,
      events: FieldValue.arrayUnion({ type: event, at: now(), ...(by ? { by } : {}) }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (docSnap.exists) tx.update(docRef, docPatch(status, unlock));
  });
}

/**
 * Merges DocuSign's view of the envelope into the request + document (monotonic, idempotent).
 * Returns the resulting status, or null if the request is unknown / for another envelope.
 */
async function applySummary(requestId: string, s: DsEnvelopeSummary): Promise<SignatureStatus | null> {
  return db().runTransaction(async tx => {
    const ref = requests().doc(requestId);
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const r = { id: snap.id, ...(snap.data() as Omit<SignatureRequest, 'id'>) };
    if (s.envelopeId && s.envelopeId !== r.envelopeId) return null;
    const res = deriveSync(r, s, now());
    if (!res) return r.status;
    const docRef = documents().doc(r.documentId);
    const docSnap = await tx.get(docRef);
    tx.update(ref, {
      status: res.status,
      recipients: res.recipients,
      ...(res.events.length ? { events: FieldValue.arrayUnion(...res.events) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (docSnap.exists) tx.update(docRef, docPatch(res.status, res.unlock));
    return res.status;
  });
}

/**
 * POST /api/signatures/webhook/[token] — DocuSign Connect (D8). The token authenticates the call;
 * Firestore is updated FROM THE PAYLOAD, never by re-fetching the envelope (D13b).
 * Returns false for unknown tokens.
 */
export async function handleConnectWebhook(tokenHash: string, body: unknown): Promise<boolean> {
  const hit = await requests().where('webhookTokenHash', '==', tokenHash).limit(1).get();
  if (hit.empty) return false;
  const summary = summaryFromConnect(body);
  if (!summary) return true;
  const status = await applySummary(hit.docs[0].id, summary);
  // Filed inline (not after responding): the SSR function may be frozen once the response is sent.
  // A failure here is recorded on the request and retried from "Actualizar estado".
  if (status === 'completed') await fileSignedDocument(hit.docs[0].id);
  return true;
}

/**
 * Phase 4 — files the signed PDF (documents + Certificate of Completion, one combined download,
 * D13b) next to the original and links it. Exactly once: a lease in a transaction prevents two
 * concurrent webhook deliveries from filing twice; `signedDocumentId` makes later calls no-ops.
 * Never throws — errors are stored in `filingError` for the panel.
 */
export async function fileSignedDocument(requestId: string): Promise<string | null> {
  const ref = requests().doc(requestId);
  const r = await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const cur = { id: snap.id, ...(snap.data() as Omit<SignatureRequest, 'id'>) };
    if (cur.status !== 'completed' || cur.signedDocumentId) return null;
    const started = cur.filingStartedAt ? Date.parse(cur.filingStartedAt) : 0;
    if (Date.now() - started < FILING_LEASE_MS) return null;      // another delivery is filing
    tx.update(ref, { filingStartedAt: now(), filingError: FieldValue.delete() });
    return cur;
  });
  if (!r) return null;

  try {
    const creds = await getValidAccessToken(r.userId);
    const pdf = await downloadCombinedPdf(creds, r.envelopeId);

    const original = (await documents().doc(r.documentId).get()).data() ?? {};
    // Stamp with the moment the envelope completed (not the filing retry time).
    const completedAt = [...(r.events ?? [])].reverse().find(e => e.type === 'completed')?.at;
    const signedAt = completedAt && Number.isFinite(Date.parse(completedAt)) ? new Date(completedAt) : new Date();
    const name = signedFileName((original.name as string) || 'Documento', signedAt);
    const path = signedStoragePath(original.storagePath as string | undefined, r.userId, Date.now(), name);
    const bucketName = documentsBucket();
    const token = randomUUID();
    await storage().bucket(bucketName).file(path).save(pdf, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    const signedRef = documents().doc();
    const at = now();
    const batch = db().batch();
    batch.set(signedRef, {
      userId: r.userId,
      caseId: (original.caseId as string | null) ?? r.caseId ?? null,
      clientId: (original.clientId as string | null) ?? r.clientId ?? null,
      folderId: (original.folderId as string | null) ?? null,
      name,
      type: 'pdf',
      size: pdf.length,
      storagePath: path,
      downloadUrl: firebaseDownloadUrl(bucketName, path, token),
      source: 'docusign',
      status: 'Firmado',
      kind: 'signed',
      signedFromDocumentId: r.documentId,
      signatureRequestId: r.id,
      signatureStatus: 'completed',
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(ref, {
      signedDocumentId: signedRef.id,
      filingStartedAt: FieldValue.delete(),
      events: FieldValue.arrayUnion({ type: 'filed', at }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return signedRef.id;
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error('[signatures] filing failed', r.id, msg);
    await ref.update({ filingStartedAt: FieldValue.delete(), filingError: msg.slice(0, 300) }).catch(() => {});
    return null;
  }
}

/**
 * POST /api/signatures/[id]/refresh — manual "Actualizar estado" only (D9). At most one DocuSign
 * call per envelope per 15 min; inside the window it answers from Firestore.
 */
export async function refreshSignatureRequest(uid: string, requestId: string) {
  const r = await loadOwnedRequest(uid, requestId);
  const needsFiling = r.status === 'completed' && !r.signedDocumentId;
  if (!isActiveStatus(r.status) && !needsFiling) return { status: r.status, nextRefreshAt: null, throttled: false };

  const ref = requests().doc(r.id);
  const blockedUntil = await db().runTransaction(async tx => {
    const until = refreshAvailableAt((await tx.get(ref)).get('lastSyncedAt') as string | undefined);
    if (Date.now() < until) return until;
    tx.update(ref, { lastSyncedAt: now() });            // claim the slot before calling DocuSign
    return 0;
  });
  if (blockedUntil) return { status: r.status, nextRefreshAt: new Date(blockedUntil).toISOString(), throttled: true };

  // Completed but the signed PDF isn't filed yet (failed or pre-Phase 4): retry the filing only.
  if (needsFiling) {
    await fileSignedDocument(r.id);
    return { status: r.status, nextRefreshAt: new Date(Date.now() + REFRESH_WINDOW_MS).toISOString(), throttled: false };
  }
  const creds = await getValidAccessToken(uid);
  const envelope = await getEnvelopeWithRecipients(creds, r.envelopeId);
  const status = (await applySummary(r.id, envelope)) ?? r.status;
  if (status === 'completed') await fileSignedDocument(r.id);
  return { status, nextRefreshAt: new Date(Date.now() + REFRESH_WINDOW_MS).toISOString(), throttled: false };
}

/** Counterparties DocuSign is currently waiting on (their turn has come, not answered yet). */
function pendingSigners(r: SignatureRequest) {
  return r.recipients.filter(x => x.role === 'signer' && (x.status === 'sent' || x.status === 'delivered'));
}

function requireWaitingOnOthers(r: SignatureRequest) {
  if (r.status !== 'sent' && r.status !== 'delivered') {
    throw fail(r.status === 'pending_owner'
      ? 'Primero tienes que firmar tú.'
      : 'Esta solicitud ya no está pendiente.', 'not_pending', 409);
  }
}

/** POST /api/signatures/[id]/remind — re-sends DocuSign's email to everyone whose turn it is (max 1/hour). */
export async function remindCounterparty(uid: string, requestId: string) {
  const r = await loadOwnedRequest(uid, requestId);
  requireWaitingOnOthers(r);
  const pending = pendingSigners(r);
  if (!pending.length) throw fail('No hay nadie pendiente de firmar ahora mismo.', 'not_pending', 409);
  const last = r.lastRemindedAt ? Date.parse(r.lastRemindedAt) : 0;
  if (Date.now() - last < REMIND_WINDOW_MS) {
    throw fail('Ya enviaste un recordatorio hace menos de una hora.', 'throttled', 429);
  }
  const creds = await getValidAccessToken(uid);
  await updateSignerAndResend(creds, r.envelopeId,
    pending.map(c => ({ recipientId: String(recipientKey(c)), name: c.name, email: c.email })));
  const at = now();
  await requests().doc(r.id).update({
    lastRemindedAt: at,
    events: FieldValue.arrayUnion(...pending.map(c => ({ type: 'reminded', at, by: c.email }))),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, reminded: pending.map(c => c.email) };
}

/**
 * PATCH /api/signatures/[id]/recipients — corrects one signer's email and re-sends.
 * `recipientId` picks the signer (defaults to the first counterparty, as before 5b).
 */
export async function correctCounterpartyEmail(uid: string, requestId: string, email: string, name?: string, recipientId?: number) {
  const clean = (email ?? '').trim();
  if (!EMAIL_RE.test(clean)) throw fail('El email no es válido.', 'invalid_email', 422);
  const r = await loadOwnedRequest(uid, requestId);
  requireWaitingOnOthers(r);
  const c = r.recipients.find(x => x.role === 'signer' && (recipientId === undefined || recipientKey(x) === recipientId));
  if (!c) throw fail('Firmante no encontrado.', 'not_found', 404);
  if (c.status === 'completed' || c.status === 'declined') throw fail('Esta persona ya ha respondido.', 'not_pending', 409);
  if (r.recipients.some(x => x !== c && x.email.toLowerCase() === clean.toLowerCase())) {
    throw fail(r.recipients.find(x => x.role === 'owner')?.email.toLowerCase() === clean.toLowerCase()
      ? 'El email de la otra parte no puede ser el tuyo.'
      : 'Ese email ya está en esta solicitud.', 'invalid_email', 422);
  }
  const newName = (name ?? '').trim() || c.name;
  const creds = await getValidAccessToken(uid);
  await updateSignerAndResend(creds, r.envelopeId, [{ recipientId: String(recipientKey(c)), name: newName, email: clean }]);
  const at = now();
  // A signer whose turn hasn't come yet stays "created"; DocuSign emails them when it does.
  const recipients = r.recipients.map(x => x === c ? { ...x, email: clean, name: newName, status: c.status === 'created' ? 'created' as const : 'sent' as const } : x);
  await setStatus(r, r.status === 'delivered' ? 'sent' : r.status, { recipients, lastRemindedAt: at }, 'email_corrected', false, clean);
  return { ok: true };
}

/** POST /api/signatures/[id]/void — cancels the envelope and unlocks the document (D11). */
export async function voidSignatureRequest(uid: string, requestId: string) {
  const r = await loadOwnedRequest(uid, requestId);
  if (!isActiveStatus(r.status)) throw fail('Esta solicitud ya no está activa.', 'not_pending', 409);
  const creds = await getValidAccessToken(uid);
  await voidEnvelope(creds, r.envelopeId, 'Anulado por el remitente desde Avocat');
  await setStatus(r, 'voided', {}, 'voided', true);
  return { ok: true };
}

/**
 * POST /api/signatures/[id]/return — the owner came back from embedded signing with ?event=.
 * No envelope GET (D13b): the event moves pending_owner forward; webhooks (Phase 3) are the
 * source of truth after that. Decline voids the envelope and unlocks the document (D11).
 */
export async function recordOwnerReturn(uid: string, requestId: string, event: string) {
  const r = await loadOwnedRequest(uid, requestId);
  const counterparty = r.recipients.find(x => x.role === 'signer') ?? null;
  const counterparties = r.recipients.filter(x => x.role === 'signer');
  const summary = { status: r.status, counterparty, counterparties, documentId: r.documentId };

  if (r.status !== 'pending_owner') return summary;            // reload / back button — idempotent

  if (event === 'signing_complete') {
    const recipients = r.recipients.map(x =>
      x.role === 'owner' ? { ...x, status: 'completed' as const, signedAt: now() }
      : x.role === 'signer' && x.routingOrder === 2 ? { ...x, status: 'sent' as const } : x);   // first in line (all, if parallel)
    await setStatus(r, 'sent', { recipients }, 'owner_signed');
    return { ...summary, status: 'sent' as const };
  }
  if (event === 'decline') {
    const creds = await getValidAccessToken(uid);
    await voidEnvelope(creds, r.envelopeId, 'El remitente rechazó firmar').catch(err => {
      console.warn('[signatures] void after decline failed:', (err as Error).message);
    });
    await setStatus(r, 'voided', {}, 'owner_declined', true);
    return { ...summary, status: 'voided' as const };
  }
  return summary;
}
