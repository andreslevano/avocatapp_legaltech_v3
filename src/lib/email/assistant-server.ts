// Revisión de Email — the assistant (server): plan the search from the purpose, rank by relevance,
// read the selected emails (and the attachments the user ticks), digest them, relate them to Avocat's
// data, draft a reply on request, save an attachment to a case. Read-only on the mailbox. Server-only.

import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { FieldValue } from 'firebase-admin/firestore';
import { db, storage } from '@/lib/firebase-admin';
import { pdfText } from '@/lib/pdf-text';
import { downloadGmailAttachment, fetchFullMessage, searchMessages } from '@/lib/gmail';
import { firebaseDownloadUrl } from '@/lib/signatures/filing';
import { gmailQuery, outlookSearch, type EmailMessage, type EmailMessageFull, type EmailProvider, type SearchCriteria } from './core';
import {
  applyRanking, cleanDigest, cleanPlan, domainOf, groupThreads, matchContext, MAX_ANALYSIS_EMAILS, MAX_CANDIDATES, parseAddresses, planQuery,
  stripQuoted, type DigestSource, type EmailDigest, type MatchRecord, type Participant, type RankedEmail, type SearchPlan, type Suggestion, type Thread,
} from './assistant-core';
import { downloadOutlookAttachment, fetchOutlookMessage, searchOutlook } from './outlook';
import { tokenFor, type EmailCaller } from './server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FAST_MODEL = 'claude-haiku-4-5-20251001';    // planning + ranking (same as the single-email analysis)
const DEEP_MODEL = 'claude-sonnet-4-6';             // the digest and reply drafts (same as the agent)

function jsonFrom(text: string): unknown {
  const t = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  const m = t.match(/[[{][\s\S]*[\]}]/);
  return m ? JSON.parse(m[0]) : null;
}

async function ask(model: string, system: string, user: string, maxTokens: number): Promise<string> {
  const r = await anthropic.messages.create({ model, max_tokens: maxTokens, temperature: 0.2, system, messages: [{ role: 'user', content: user }] });
  return r.content.map(b => (b.type === 'text' ? b.text : '')).join('');
}

// ── 1. Search: plan → query → candidates → relevance ────────────────────

const PLAN_SYSTEM = `Eres el asistente de búsqueda de emails de un despacho de abogados. Conviertes lo que el usuario necesita saber en un plan de búsqueda.
Devuelve SOLO JSON: {"people":[{"name":"Nombre Apellido","email":"si lo indica"}],"topics":["palabra o frase corta"],"intent":"una frase: qué quiere saber"}
Reglas: los nombres de personas u organizaciones con las que se habla van en "people" (se buscarán como remitente/destinatario/copia, no en el texto). "topics": 0-6 términos clave del asunto (sin nombres de personas, sin palabras vacías). No inventes emails.`;

export async function planSearch(purpose: string, criteria: SearchCriteria): Promise<SearchPlan> {
  const user = [`Necesidad: ${purpose || '(no indicada)'}`, `Palabras clave: ${criteria.keywords || '-'}`, `Remitente: ${criteria.from || '-'}`].join('\n');
  try {
    const plan = cleanPlan(jsonFrom(await ask(FAST_MODEL, PLAN_SYSTEM, user, 400)), purpose);
    if (criteria.from && /@/.test(criteria.from) && !plan.people.some(p => p.email === criteria.from!.toLowerCase())) {
      plan.people.unshift({ email: criteria.from.trim().toLowerCase() });
    }
    return plan;
  } catch (err) {
    console.warn('[email/assist] plan', (err as Error).message);
    return cleanPlan({ topics: criteria.keywords ? [criteria.keywords] : [], intent: purpose });
  }
}

const RANK_SYSTEM = `Valoras la relevancia de emails para lo que necesita saber un abogado. Para cada email devuelve score 0-100 y una razón muy corta en español (máx. 12 palabras), p. ej. "Pablo propone fechas del piloto" o "Solo le mencionan en copia".
Devuelve SOLO JSON: [{"i":0,"score":85,"reason":"..."}]`;

async function rank(purpose: string, list: EmailMessage[]): Promise<RankedEmail[]> {
  if (!purpose || list.length === 0) return applyRanking(list, []);
  const rows = list.map((m, i) => `${i}. De: ${m.from} | Para: ${m.to.slice(0, 160)} | ${m.date} | ${m.subject} | ${m.snippet.slice(0, 200)}`).join('\n');
  try {
    return applyRanking(list, jsonFrom(await ask(FAST_MODEL, RANK_SYSTEM, `Necesidad: ${purpose}\n\nEmails:\n${rows}`, 1500)));
  } catch (err) {
    console.warn('[email/assist] rank', (err as Error).message);
    return applyRanking(list, []);
  }
}

async function candidates(token: string, provider: EmailProvider, query: string | null): Promise<EmailMessage[]> {
  return provider === 'gmail' ? searchMessages(token, query ?? 'in:inbox', MAX_CANDIDATES) : searchOutlook(token, query, MAX_CANDIDATES);
}

export interface AssistSearchResult { plan: SearchPlan; usedPlan: boolean; results: RankedEmail[]; threads: Thread[] }

export async function assistSearch(c: EmailCaller, provider: EmailProvider, purpose: string, criteria: SearchCriteria): Promise<AssistSearchResult> {
  const token = await tokenFor(c, provider);
  const smart = !!(purpose.trim() || criteria.keywords?.trim() || criteria.from?.trim());
  const plan = smart ? await planSearch(purpose.trim(), criteria) : cleanPlan({}, '');
  let list = smart ? await candidates(token, provider, planQuery(provider, plan, criteria)) : [];
  let usedPlan = smart;
  // Nothing with the plan (or no criteria): the plain search, as before.
  if (!list.length) {
    usedPlan = false;
    list = await candidates(token, provider, provider === 'gmail' ? gmailQuery(criteria) : outlookSearch(criteria));
  }
  const results = await rank(purpose.trim() || plan.intent, list);
  return { plan, usedPlan, results, threads: groupThreads(results) };
}

// ── 2. Digest of the selection (+ ticked attachments) ───────────────────

const READABLE = /\.(pdf|docx|txt|md|csv)$/i;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

async function attachmentText(buf: Buffer, name: string): Promise<string> {
  if (/\.pdf$/i.test(name)) return (await pdfText(buf)).slice(0, 8000);
  if (/\.docx$/i.test(name)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth');
    return (((await mammoth.extractRawText({ buffer: buf })).value as string) ?? '').slice(0, 8000);
  }
  return buf.toString('utf8').slice(0, 8000);
}

export async function downloadAttachment(token: string, provider: EmailProvider, messageId: string, attachmentId: string): Promise<Buffer> {
  return provider === 'gmail' ? downloadGmailAttachment(token, messageId, attachmentId) : downloadOutlookAttachment(token, messageId, attachmentId);
}

const DIGEST_SYSTEM = `Eres un asistente jurídico que lee conversaciones de email para un abogado (España / Latinoamérica). Lees los emails numerados (y los adjuntos marcados) y extraes lo útil para el trabajo del abogado, en español, sin inventar nada.
Cada elemento indica en "fuentes" los números de email de donde sale.
Devuelve SOLO JSON con esta forma:
{"resumen":"3-6 frases","cronologia":[{"fecha":"AAAA-MM-DD","quien":"","que":"","fuentes":[1]}],"temas":["..."],
"puntosAtencion":[{"texto":"riesgos, compromisos, contradicciones, cláusulas o términos relevantes","fuentes":[1]}],
"fechas":[{"fecha":"AAAA-MM-DD o texto","que":"plazo / reunión / vencimiento","fuentes":[2]}],
"acciones":[{"quien":"","que":"","cuando":"","fuentes":[1]}],
"personas":[{"nombre":"","email":"","organizacion":"","rol":""}],
"importes":[{"importe":"","concepto":"","fuentes":[1]}],
"adjuntosRelevantes":[{"nombre":"","porque":"","fuentes":[1]}],
"preguntasAbiertas":["..."]}`;

export interface DigestResult {
  digest: EmailDigest;
  sources: (DigestSource & { id: string; provider: EmailProvider })[];
  participants: Participant[];
  suggestions: Suggestion[];
  attachmentsRead: string[];
}

export async function digestEmails(
  c: EmailCaller, provider: EmailProvider, purpose: string, ids: string[], attachments: { messageId: string; attachmentId: string; name: string }[],
): Promise<DigestResult> {
  const sel = [...new Set(ids)].slice(0, MAX_ANALYSIS_EMAILS);
  if (!sel.length) throw Object.assign(new Error('Elige al menos un email.'), { status: 400 });
  const token = await tokenFor(c, provider);
  const full: EmailMessageFull[] = [];
  for (const id of sel) {
    full.push(provider === 'gmail' ? await fetchFullMessage(token, id) : await fetchOutlookMessage(token, id));
  }
  full.sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));

  // Attachments only when the user ticked them, and only text-readable types.
  const attText = new Map<string, string[]>();
  const attachmentsRead: string[] = [];
  for (const a of attachments.slice(0, 10)) {
    const m = full.find(x => x.id === a.messageId);
    const meta = m?.attachments.find(x => x.id === a.attachmentId);
    if (!m || !meta || !READABLE.test(meta.name) || meta.size > MAX_ATTACHMENT_BYTES) continue;
    try {
      const txt = await attachmentText(await downloadAttachment(token, provider, m.id, a.attachmentId), meta.name);
      if (txt.trim()) { attText.set(m.id, [...(attText.get(m.id) ?? []), `[Adjunto: ${meta.name}]\n${txt}`]); attachmentsRead.push(meta.name); }
    } catch (err) { console.warn('[email/assist] attachment', (err as Error).message); }
  }

  const blocks = full.map((m, i) => [
    `=== Email ${i + 1} ===`, `Fecha: ${m.date}`, `De: ${m.from}`, `Para: ${m.to}`, `Asunto: ${m.subject}`,
    m.attachments.length ? `Adjuntos: ${m.attachments.map(x => x.name).join(', ')}` : '',
    '', stripQuoted(m.bodyText), ...(attText.get(m.id) ?? []),
  ].filter(Boolean).join('\n'));
  let text = blocks.join('\n\n');
  if (text.length > 120_000) text = text.slice(0, 120_000) + '\n[…recortado]';

  const raw = await ask(DEEP_MODEL, DIGEST_SYSTEM, `Lo que el abogado necesita saber: ${purpose || 'un resumen útil de la conversación'}\n\n${text}`, 4000);
  const digest = cleanDigest(jsonFrom(raw), full.length);
  const sources = full.map((m, i) => ({ n: i + 1, id: m.id, provider, subject: m.subject, from: m.from, date: m.date }));
  const participants = dedupe([...full.flatMap(m => [...parseAddresses(m.from), ...parseAddresses(m.to)]),
    ...digest.personas.filter(p => p.email).map(p => ({ name: p.nombre || p.email, email: p.email }))]);
  const suggestions = await relatedInAvocat(c, participants, digest.personas.map(p => p.organizacion).filter(Boolean));
  return { digest, sources, participants, suggestions, attachmentsRead };
}

const dedupe = (ps: Participant[]) => ps.filter((p, i) => ps.findIndex(x => x.email === p.email) === i);

// ── 3. Relations with Avocat's data ─────────────────────────────────────

export async function relatedInAvocat(c: EmailCaller, participants: Participant[], organizations: string[]): Promise<Suggestion[]> {
  const uid = c.uid;
  const [clients, cases, negs, sigs, contracts] = await Promise.all([
    db().collection('clients').where('userId', '==', uid).get(),
    db().collection('cases').where('userId', '==', uid).get(),
    db().collection('negotiations').where('ownerId', '==', uid).get(),
    db().collection('signature_requests').where('userId', '==', uid).get(),
    db().collection('contracts').where('userId', '==', uid).get(),
  ]);
  const records: MatchRecord[] = [
    ...negs.docs.map(d => ({ id: d.id, kind: 'negotiation' as const, title: String(d.get('title') ?? 'NDA'), emails: [String(d.get('counterparty')?.email ?? '')], clientId: d.get('clientId') ?? null, href: `/negociaciones/${d.id}` })),
    ...sigs.docs.map(d => ({ id: d.id, kind: 'signature' as const, title: String(d.get('subject') ?? 'Firma').replace(/^Firma solicitada:\s*/i, ''), emails: ((d.get('recipients') ?? []) as { email?: string }[]).map(r => r.email ?? ''), clientId: d.get('clientId') ?? null, href: `/documents?doc=${encodeURIComponent(String(d.get('documentId') ?? ''))}` })),
    ...contracts.docs.map(d => ({ id: d.id, kind: 'contract' as const, title: String(d.get('title') ?? 'Contrato'), emails: ((d.get('parties') ?? []) as { email?: string }[]).map(p => p.email ?? ''), clientId: d.get('clientId') ?? null, href: `/documents?doc=${encodeURIComponent(String(d.get('documentId') ?? ''))}` })),
  ];
  return matchContext({
    participants, organizations,
    own: { emails: [c.email ?? ''], domain: c.email ? domainOf(c.email) : undefined },
    clients: clients.docs.map(d => ({ id: d.id, name: String(d.get('name') ?? ''), company: d.get('company') ?? undefined, email: d.get('email') ?? undefined })),
    cases: cases.docs.map(d => ({ id: d.id, title: String(d.get('title') ?? ''), client: d.get('client') ?? undefined, clientId: d.get('clientId') ?? undefined, status: d.get('status') ?? undefined })),
    records,
  });
}

// ── 4. Reply draft (button) ─────────────────────────────────────────────

const REPLY_SYSTEM = `Redactas borradores de respuesta de email para un abogado, en el idioma de la conversación, tono profesional y cordial, claros y breves. No inventes hechos, cifras ni compromisos que no estén en la conversación o en las instrucciones; si falta información, deja [PENDIENTE: …]. Devuelve solo el texto del email (sin asunto, sin comentarios).`;

export async function replyDraft(c: EmailCaller, provider: EmailProvider, ids: string[], instructions: string, digestSummary: string): Promise<{ draft: string; subject: string }> {
  const token = await tokenFor(c, provider);
  const sel = [...new Set(ids)].slice(0, 10);
  const full: EmailMessageFull[] = [];
  for (const id of sel) full.push(provider === 'gmail' ? await fetchFullMessage(token, id) : await fetchOutlookMessage(token, id));
  full.sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
  const last = full[full.length - 1];
  const convo = full.map((m, i) => `--- Email ${i + 1} · ${m.date} · De: ${m.from}\n${stripQuoted(m.bodyText, 2500)}`).join('\n\n');
  const draft = await ask(DEEP_MODEL, REPLY_SYSTEM,
    `Instrucciones del abogado: ${instructions || 'responde al último email'}\n${digestSummary ? `Resumen del análisis: ${digestSummary}\n` : ''}Respondes como ${c.email ?? 'el abogado'} al último email (de ${last?.from ?? ''}).\n\n${convo}`, 1200);
  return { draft: draft.trim(), subject: last ? (/^re:/i.test(last.subject) ? last.subject : `RE: ${last.subject}`) : '' };
}

// ── Save an attachment to a case / client (button) ─────────────────────

const PLAN_FOLDER: Record<string, string> = { Abogados: 'abogado', Estudiantes: 'estudiante', Autoservicio: 'autoservicio' };
const bucketName = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';

export async function saveAttachment(c: EmailCaller, provider: EmailProvider, input: { messageId: string; attachmentId: string; caseId?: string | null; clientId?: string | null }) {
  const token = await tokenFor(c, provider);
  const msg = provider === 'gmail' ? await fetchFullMessage(token, input.messageId) : await fetchOutlookMessage(token, input.messageId);
  const meta = msg.attachments.find(a => a.id === input.attachmentId);
  if (!meta) throw Object.assign(new Error('Adjunto no encontrado.'), { status: 404 });
  if (meta.size > MAX_ATTACHMENT_BYTES) throw Object.assign(new Error('El adjunto pesa más de 15 MB.'), { status: 400 });
  for (const [col, id] of [['cases', input.caseId], ['clients', input.clientId]] as const) {
    if (id && (await db().collection(col).doc(id).get()).get('userId') !== c.uid) throw Object.assign(new Error('No encontrado.'), { status: 404 });
  }
  const bytes = await downloadAttachment(token, provider, input.messageId, input.attachmentId);
  const plan = (await db().collection('users').doc(c.uid).get()).get('plan') as string | undefined;
  const name = meta.name.replace(/[/\\]/g, '_').slice(0, 150) || 'adjunto';
  const path = `users/${c.uid}/${PLAN_FOLDER[plan ?? ''] ?? 'abogado'}/${input.caseId ? `casos/${input.caseId}` : 'generacion-escritos'}/${Date.now()}_${name}`;
  const dlToken = randomUUID();
  await storage().bucket(bucketName()).file(path).save(bytes, { resumable: false, contentType: meta.mimeType, metadata: { metadata: { firebaseStorageDownloadTokens: dlToken } } });
  const ref = db().collection('documents').doc();
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  await ref.set({
    userId: c.uid, caseId: input.caseId ?? null, ...(input.clientId ? { clientId: input.clientId } : {}),
    name, type: ext, size: bytes.length,
    storagePath: path, downloadUrl: firebaseDownloadUrl(bucketName(), path, dlToken), source: 'uploaded',
    origin: { kind: 'email', provider, subject: msg.subject.slice(0, 200), from: msg.from.slice(0, 200), date: msg.date },
    createdAt: FieldValue.serverTimestamp(),
  });
  return { documentId: ref.id, name };
}
