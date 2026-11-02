// contracts/{id} orchestration (Admin SDK). Server-only.
//   contracts/{id}  — owner read-only (rules); every write goes through here.
//   documents/{id}  — contractId / contractConfirmed / contractNextDate / contractLifecycle are
//                     denormalized here (server-only fields in the rules) for badges and views.

import OpenAI from 'openai';
import { db, storage } from '@/lib/firebase-admin';
import { addDays, computeDates, lifecycleFor, madridToday, nextContractEvent } from './dates';
import {
  contractFromExtraction, contractFromNdaForm, EXTRACTION_JSON_SCHEMA, EXTRACTION_SYSTEM_PROMPT,
  type NdaFormInput, type NewContract,
} from './extract';
import type { Contract, ContractEdit, Lifecycle } from './types';

export class ContractError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

const contracts = () => db().collection('contracts');
const documents = () => db().collection('documents');
const now = () => new Date().toISOString();
const EXTRACTION_MODEL = 'gpt-4o';
const MAX_FILE_BYTES = 8_000_000;
const MAX_TEXT_CHARS = 24_000;

const documentsBucket = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';

async function ownedDocument(uid: string, documentId: string) {
  const snap = await documents().doc(documentId).get();
  if (!snap.exists || snap.get('userId') !== uid) throw new ContractError('Documento no encontrado.', 'not_found', 404);
  return snap;
}

export async function loadOwnedContract(uid: string, id: string): Promise<Contract> {
  const snap = await contracts().doc(id).get();
  if (!snap.exists || snap.get('userId') !== uid) throw new ContractError('Contrato no encontrado.', 'not_found', 404);
  return { id: snap.id, ...(snap.data() as Omit<Contract, 'id'>) };
}

/** Badge / "Contratos por vencer" data on the document. */
function documentFields(c: Pick<Contract, 'id' | 'confirmedByUser' | 'dates' | 'lifecycle'>) {
  return {
    contractId: c.id,
    contractConfirmed: c.confirmedByUser,
    contractNextDate: nextContractEvent(c.dates, madridToday())?.date ?? null,
    contractLifecycle: c.lifecycle,
  };
}

async function syncDocument(c: Contract) {
  await documents().doc(c.documentId).update(documentFields(c)).catch(err =>
    console.warn('[contracts] document sync', c.documentId, (err as Error).message));
}

async function existingFor(uid: string, documentId: string): Promise<Contract | null> {
  const q = await contracts().where('userId', '==', uid).where('documentId', '==', documentId).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...(q.docs[0].data() as Omit<Contract, 'id'>) };
}

async function save(id: string | null, data: NewContract): Promise<Contract> {
  const ref = id ? contracts().doc(id) : contracts().doc();
  const at = now();
  const today = madridToday();
  const lifecycle = (lifecycleFor(data.lifecycle, data.dates, today) ?? data.lifecycle) as Lifecycle;
  const full = { ...data, lifecycle, updatedAt: at, ...(id ? {} : { createdAt: at }) };
  await ref.set(full, { merge: true });
  const c = { id: ref.id, ...(await ref.get()).data() } as Contract;
  await syncDocument(c);
  return c;
}

// ── Generated NDAs (/tools/nda) ─────────────────────────────────

export async function createContractFromNda(uid: string, input: NdaFormInput): Promise<Contract> {
  const docSnap = await ownedDocument(uid, input.documentId);
  const existing = await existingFor(uid, input.documentId);
  if (existing) return existing;

  let renews: Contract | null = null;
  if (input.renewsContractId) renews = await loadOwnedContract(uid, input.renewsContractId).catch(() => null);

  const data = contractFromNdaForm(
    { ...input, clientId: input.clientId ?? (docSnap.get('clientId') as string | null) ?? null, renewsContractId: renews?.id ?? null },
    uid, madridToday(),
  );
  data.caseId = (docSnap.get('caseId') as string | null) ?? null;
  const c = await save(null, data);

  if (renews) {
    const lifecycle: Lifecycle = input.supersedes ? 'superseded' : 'renewed';
    await contracts().doc(renews.id).update({ lifecycle, renewedByContractId: c.id, updatedAt: now() });
    await syncDocument({ ...renews, lifecycle });
    await resolveNotifications(uid, renews.id);
  }
  return c;
}

/** When a generated NDA is signed through DocuSign, it starts on the signing day (not the drafting day). */
export async function startContractOnSigning(uid: string, documentId: string, signedAtIso: string) {
  const c = await existingFor(uid, documentId);
  if (!c || c.extraction?.source !== 'generated' || c.term?.fixedEndDate) return;
  const day = madridToday(new Date(signedAtIso));
  if (c.dates.effectiveDate === day) return;
  await save(c.id, { ...stripId(c), dates: computeDates(day, c.term) });
}

const stripId = (c: Contract): NewContract => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...rest } = c;
  return rest;
};

// ── Uploaded / imported documents: "Analizar como contrato" ─────

const stripHtml = (html: string) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

/** PDF text layer. pdf-parse 2.x exposes a PDFParse class; 1.x was a function — support both. */
async function pdfText(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('pdf-parse');
  if (typeof mod === 'function') return (await mod(buf)).text ?? '';
  const parser = new mod.PDFParse({ data: new Uint8Array(buf) });
  try {
    return (await parser.getText()).text ?? '';
  } finally {
    await parser.destroy?.().catch?.(() => {});
  }
}

/** Text of a stored document: Avocat's Word HTML (.doc), DOCX, PDF (text layer) or plain text. */
export async function documentText(d: FirebaseFirestore.DocumentData): Promise<string> {
  const path = d.storagePath as string | undefined;
  if (!path) throw new ContractError('El documento no tiene archivo.', 'no_file', 422);
  const file = storage().bucket(documentsBucket()).file(path);
  const [meta] = await file.getMetadata();
  if (Number(meta.size ?? 0) > MAX_FILE_BYTES) throw new ContractError('El archivo es demasiado grande para analizarlo (máx. 8 MB).', 'too_large', 422);
  const [buf] = await file.download();
  const ext = String(d.type ?? path.split('.').pop() ?? '').toLowerCase();
  let text = '';
  if (ext === 'pdf') {
    text = await pdfText(buf);
  } else if (ext === 'docx') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth');
    text = (await mammoth.extractRawText({ buffer: buf })).value ?? '';
  } else if (ext === 'doc' || ext === 'html' || ext === 'htm') {
    const raw = buf.toString('utf8');
    text = /<html|<body|<p[\s>]/i.test(raw) ? stripHtml(raw) : '';
  } else if (ext === 'txt' || ext === 'md') {
    text = buf.toString('utf8');
  } else {
    throw new ContractError('Formato no compatible. Usa PDF, Word (.docx) o un documento generado en Avocat.', 'unsupported_format', 422);
  }
  text = text.trim();
  if (text.length < 200) {
    throw new ContractError(ext === 'pdf'
      ? 'Este PDF no tiene texto seleccionable (parece escaneado). Sube una versión en Word o un PDF con texto.'
      : 'No encontramos texto suficiente en el documento.', 'no_text', 422);
  }
  return text.slice(0, MAX_TEXT_CHARS);
}

export async function extractContractForDocument(uid: string, documentId: string): Promise<Contract> {
  const docSnap = await ownedDocument(uid, documentId);
  const existing = await existingFor(uid, documentId);
  if (existing?.confirmedByUser) return existing;     // confirmed data wins; edit it instead

  const text = await documentText(docSnap.data()!);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ContractError('El análisis no está disponible ahora mismo.', 'ai_unavailable', 503);
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    temperature: 0,
    max_tokens: 3000,
    response_format: { type: 'json_schema', json_schema: EXTRACTION_JSON_SCHEMA as unknown as { name: string; strict: boolean; schema: Record<string, unknown> } },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `Documento: ${docSnap.get('name')}\n\n${text}` },
    ],
  }).catch(err => {
    console.error('[contracts] extraction', (err as Error).message);
    throw new ContractError('No pudimos analizar el documento. Inténtalo de nuevo.', 'ai_error', 502);
  });
  let raw: unknown = null;
  try { raw = JSON.parse(completion.choices[0]?.message?.content ?? 'null'); } catch { raw = null; }
  const { contract, reason } = contractFromExtraction(raw, {
    uid, documentId,
    caseId: (docSnap.get('caseId') as string | null) ?? null,
    clientId: (docSnap.get('clientId') as string | null) ?? null,
    fallbackTitle: String(docSnap.get('name') ?? 'Contrato').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
    model: EXTRACTION_MODEL,
  });
  if (!contract) {
    throw reason === 'not_contract'
      ? new ContractError('Este documento no parece un contrato.', 'not_contract', 422)
      : new ContractError('No pudimos leer los datos del contrato. Inténtalo de nuevo.', 'ai_error', 502);
  }
  return save(existing?.id ?? null, contract);
}

// ── Confirmation sheet ──────────────────────────────────────────

export async function editContract(uid: string, id: string, edit: ContractEdit, confirm: boolean): Promise<Contract> {
  const c = await loadOwnedContract(uid, id);
  const term = edit.term ? { ...c.term, ...edit.term } : c.term;
  const effectiveDate = edit.effectiveDate !== undefined ? edit.effectiveDate : c.dates.effectiveDate;
  const next: NewContract = {
    ...stripId(c),
    ...(edit.title !== undefined ? { title: edit.title.trim() } : {}),
    ...(edit.type !== undefined ? { type: edit.type } : {}),
    ...(edit.ndaKind !== undefined ? { ndaKind: edit.ndaKind } : {}),
    ...(edit.jurisdictionCountry !== undefined ? { jurisdiction: { ...c.jurisdiction, country: edit.jurisdictionCountry } } : {}),
    ...(edit.parties !== undefined ? {
      parties: edit.parties.map(p => ({
        name: p.name.trim().slice(0, 200), company: p.company?.trim().slice(0, 200) || null,
        role: p.role === 'disclosing' || p.role === 'receiving' ? p.role : 'mutual',
        idType: p.idType ?? null, idNumber: p.idNumber ?? null, email: p.email ?? null,
      })),
    } : {}),
    term,
    dates: computeDates(effectiveDate, term),
  };
  if (confirm) { next.confirmedByUser = true; next.confirmedAt = now(); }
  // Dates moved: earlier alerts may no longer apply, a terminal "expired" may be active again.
  if (next.lifecycle === 'expired') next.lifecycle = 'active';
  return save(id, next);
}

// ── Alert actions (F3) ──────────────────────────────────────────

export type ContractAction = 'snooze' | 'let_expire' | 'terminate' | 'reactivate';

export async function applyContractAction(uid: string, id: string, action: ContractAction): Promise<Contract> {
  const c = await loadOwnedContract(uid, id);
  const patch: Partial<Contract> = { updatedAt: now() };
  if (action === 'snooze') patch.snoozedUntil = addDays(madridToday(), 7);
  if (action === 'let_expire') patch.alertsMuted = true;
  if (action === 'terminate') patch.lifecycle = 'terminated';
  if (action === 'reactivate') {
    patch.alertsMuted = false; patch.snoozedUntil = null;
    patch.lifecycle = (lifecycleFor('active', c.dates, madridToday()) ?? 'active') as Lifecycle;
  }
  await contracts().doc(id).update(patch);
  const updated = { ...c, ...patch } as Contract;
  await syncDocument(updated);
  if (action !== 'reactivate') await resolveNotifications(uid, id);
  return updated;
}

/** Marks the contract's notifications as read once the user has acted on it. */
async function resolveNotifications(uid: string, contractId: string) {
  const q = await db().collection('notifications')
    .where('userId', '==', uid).where('contractId', '==', contractId).where('readAt', '==', null).get();
  if (q.empty) return;
  const batch = db().batch();
  q.docs.forEach(d => batch.update(d.ref, { readAt: now(), resolved: true }));
  await batch.commit();
}
