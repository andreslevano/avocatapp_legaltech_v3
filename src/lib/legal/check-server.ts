// NDA legal check (F2 step 2). Server-only (Admin SDK).
//   nda_checks/{id}   — one result per NDA per check (owner read-only).
//   contracts/{id}.legal = { verdict, checkedAt, lastCheckId, flaggedByChangeIds: [] } — a check
//                          resolves earlier "may be affected" flags.
//   documents/{id}    — contractLegalFlag=false, contractLegalVerdict (server-only fields).
//   legal_baseline/{id} — key current law (L2), admin-managed; defaults until seeded.
// One NDA per request (the client drives 1 / several / all, so no call nears Hosting's 60 s limit).

import OpenAI from 'openai';
import { db } from '@/lib/firebase-admin';
import { madridToday } from '@/lib/contracts/dates';
import { documentText, loadOwnedContract } from '@/lib/contracts/server';
import { DEFAULT_BASELINE, type BaselineItem } from './baseline';
import { applicableRules, CHECK_JSON_SCHEMA, CHECK_SYSTEM_PROMPT, checkUserMessage, MAX_CHECKS_PER_DAY, parseCheck, type CheckFinding, type CheckVerdict } from './check';
import { LegalError } from './server';
import type { LegalChange } from './types';

const MODEL = 'gpt-4o';
const nowIso = () => new Date().toISOString();

export interface NdaCheck {
  id: string;
  userId: string;
  contractId: string;
  documentId: string;
  title: string;
  ranAt: string;
  model: string | null;
  ruleIds: string[];
  verdict: CheckVerdict;
  findings: CheckFinding[];
  unvalidatedBaseline: boolean;   // some baseline items still await a lawyer's validation
}

export async function loadBaseline(): Promise<BaselineItem[]> {
  const s = await db().collection('legal_baseline').get();
  if (s.empty) return DEFAULT_BASELINE;
  return s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BaselineItem, 'id'>) }));
}

async function consumeQuota(uid: string) {
  const ref = db().collection('users').doc(uid);
  const today = madridToday();
  await db().runTransaction(async tx => {
    const q = ((await tx.get(ref)).get('legalChecks') ?? {}) as { day?: string; count?: number };
    const count = q.day === today ? q.count ?? 0 : 0;
    if (count >= MAX_CHECKS_PER_DAY) throw new LegalError(`Has alcanzado el límite de ${MAX_CHECKS_PER_DAY} revisiones por día.`, 'quota', 429);
    tx.update(ref, { legalChecks: { day: today, count: count + 1 } });
  });
}

export async function runNdaCheck(uid: string, contractId: string): Promise<NdaCheck> {
  const c = await loadOwnedContract(uid, contractId);
  if (!c.confirmedByUser) throw new LegalError('Confirma primero los datos del contrato.', 'unconfirmed', 409);
  const docSnap = await db().collection('documents').doc(c.documentId).get();
  if (!docSnap.exists) throw new LegalError('El documento ya no existe.', 'not_found', 404);

  const [changesSnap, baseline] = await Promise.all([
    db().collection('legal_changes').where('status', '==', 'approved').get(),
    loadBaseline(),
  ]);
  const changes = changesSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LegalChange, 'id'>) }));
  const rules = applicableRules(c, changes, baseline);

  let findings: CheckFinding[] = [];
  let verdict: CheckVerdict = 'no_rules';
  let model: string | null = null;
  if (rules.length) {
    await consumeQuota(uid);
    const text = await documentText(docSnap.data()!);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new LegalError('La revisión no está disponible ahora mismo.', 'ai_unavailable', 503);
    const r = await new OpenAI({ apiKey }).chat.completions.create({
      model: MODEL, temperature: 0, max_tokens: 3000,
      response_format: { type: 'json_schema', json_schema: CHECK_JSON_SCHEMA as unknown as { name: string; strict: boolean; schema: Record<string, unknown> } },
      messages: [{ role: 'system', content: CHECK_SYSTEM_PROMPT }, { role: 'user', content: checkUserMessage(c.title, text, rules) }],
    }).catch(err => {
      console.error('[legal-check]', (err as Error).message);
      throw new LegalError('No pudimos revisar el NDA. Inténtalo de nuevo.', 'ai_error', 502);
    });
    let raw: unknown = null;
    try { raw = JSON.parse(r.choices[0]?.message?.content ?? 'null'); } catch { raw = null; }
    ({ findings, verdict } = parseCheck(raw, rules));
    model = MODEL;
  }

  const ref = db().collection('nda_checks').doc();
  const check: Omit<NdaCheck, 'id'> = {
    userId: uid, contractId: c.id, documentId: c.documentId, title: c.title, ranAt: nowIso(), model,
    ruleIds: rules.map(x => x.id), verdict, findings,
    unvalidatedBaseline: rules.some(x => x.kind === 'baseline' && !x.validatedByLawyer),
  };
  await ref.set(check);
  await db().collection('contracts').doc(c.id).update({
    'legal.verdict': verdict, 'legal.checkedAt': check.ranAt, 'legal.lastCheckId': ref.id, 'legal.flaggedByChangeIds': [],
  });
  await docSnap.ref.update({ contractLegalFlag: false, contractLegalVerdict: verdict });
  return { id: ref.id, ...check };
}

// ── Baseline administration ─────────────────────────────────────

export async function seedBaseline(): Promise<number> {
  let created = 0;
  for (const b of DEFAULT_BASELINE) {
    const { id, ...rest } = b;
    await db().collection('legal_baseline').doc(id).create({ ...rest, updatedAt: nowIso() }).then(() => created++).catch(() => {});
  }
  return created;
}

export async function updateBaselineItem(id: string, patch: Partial<Omit<BaselineItem, 'id'>>) {
  const ref = db().collection('legal_baseline').doc(id);
  if (!(await ref.get()).exists) throw new LegalError('Requisito no encontrado.', 'not_found', 404);
  await ref.update({ ...patch, updatedAt: nowIso() });
}
