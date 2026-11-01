// signature_requests orchestration (Admin SDK). Server-only.
//   signature_requests/{id} — owner read-only (rules); all writes here.
//   documents/{id}          — signatureRequestId / signatureStatus / lockedAt / kind set here only (D11).

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { buildDocHtml, countSignatureBlocks, type DocMeta } from '@/lib/doc-html';
import { randomToken, sha256Base64Url } from '@/lib/integrations/crypto';
import { dsServerConfig } from '@/lib/docusign/config';
import { buildEnvelopeDefinition, webhookUrlFor } from '@/lib/docusign/envelope';
import { createEnvelope, createRecipientView, DocusignApiError, voidEnvelope } from '@/lib/docusign/api';
import { getValidAccessToken } from '@/lib/docusign/tokens';
import {
  DEFAULT_SIGNATURE_OPTIONS, isActiveStatus,
  type CreateSignatureInput, type SignatureRequest, type SignatureStatus,
} from './types';

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
  if (countSignatureBlocks(input.markdown) < 2) {
    throw fail('No encontramos los dos bloques de firma ("Firma: ____") en el documento.', 'no_signature_blocks', 422);
  }

  const creds = await getValidAccessToken(uid);
  if (!creds.userEmail) throw fail('Reconecta tu cuenta de DocuSign.', 'reconnect_required', 409);
  const owner = { name: creds.userName || creds.userEmail, email: creds.userEmail, clientUserId: uid };
  const options = { ...DEFAULT_SIGNATURE_OPTIONS, ...input.options };

  const reqRef = requests().doc();
  const webhookToken = randomToken(32);
  const webhookUrl = webhookUrlFor(process.env.DOCUSIGN_WEBHOOK_BASE_URL, webhookToken);
  const html = buildDocHtml(input.markdown, input.title, undefined, await ownerMeta(uid), { forSignature: true });

  const { envelopeId } = await createEnvelope(creds, buildEnvelopeDefinition({
    html,
    documentName: input.title,
    subject: input.subject,
    message: input.message,
    owner,
    counterparty: input.counterparty,
    options,
    requestId: reqRef.id,
    webhookUrl,
  }));

  const at = now();
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
      { role: 'owner', name: owner.name, email: owner.email, routingOrder: 1, status: 'sent' },
      { role: 'signer', name: input.counterparty.name.trim(), email: input.counterparty.email.trim(), routingOrder: 2, status: 'created' },
    ],
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

async function setStatus(r: SignatureRequest, status: SignatureStatus, patch: Partial<SignatureRequest>, event: string, unlock = false) {
  const batch = db().batch();
  batch.update(requests().doc(r.id), {
    ...patch,
    status,
    events: FieldValue.arrayUnion({ type: event, at: now() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(documents().doc(r.documentId), unlock
    ? { signatureStatus: status, lockedAt: FieldValue.delete() }
    : { signatureStatus: status });
  await batch.commit();
}

/**
 * POST /api/signatures/[id]/return — the owner came back from embedded signing with ?event=.
 * No envelope GET (D13b): the event moves pending_owner forward; webhooks (Phase 3) are the
 * source of truth after that. Decline voids the envelope and unlocks the document (D11).
 */
export async function recordOwnerReturn(uid: string, requestId: string, event: string) {
  const r = await loadOwnedRequest(uid, requestId);
  const counterparty = r.recipients.find(x => x.role === 'signer') ?? null;
  const summary = { status: r.status, counterparty, documentId: r.documentId };

  if (r.status !== 'pending_owner') return summary;            // reload / back button — idempotent

  if (event === 'signing_complete') {
    const recipients = r.recipients.map(x =>
      x.role === 'owner' ? { ...x, status: 'completed' as const, signedAt: now() }
      : x.routingOrder === 2 ? { ...x, status: 'sent' as const } : x);
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
