// Legal-change monitoring (F2 step 1). Server-only (Admin SDK).
//   legal_changes/{id}  — detected changes (new → approved | dismissed). Server-written.
//   legal_seen/{id}     — every triaged feed item, so nothing is re-triaged (dedup across runs).
//   system/legal_monitor — once-per-day marker.
// Approving a change flags the NDAs it may affect (contracts.legal + documents.contractLegalFlag)
// and notifies their owners through F3's notifications. Full NDA checks are step 2 (user-triggered).

import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { addDays, isIsoDate, madridToday } from '@/lib/contracts/dates';
import { canUseContracts } from '@/lib/contracts/config';
import { OPEN_LIFECYCLES, type Contract } from '@/lib/contracts/types';
import { fetchBoeDay, fetchEurLex, fetchItemText, type FeedItem } from './sources';
import {
  ANALYSIS_JSON_SCHEMA, ANALYSIS_SYSTEM_PROMPT, changeDocId, parseAnalysis, parseTriage,
  TRIAGE_JSON_SCHEMA, TRIAGE_SYSTEM_PROMPT, triageUserMessage, type ChangeAnalysis,
} from './triage';
import { type ChangeEdit, type LegalChange, type LegalJurisdiction } from './types';
import { isAffected } from './match';

export class LegalError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

const MODEL = 'gpt-4o';
const TRIAGE_BATCH = 40;
const MAX_ANALYSES_PER_RUN = 10;
const EU_WINDOW_DAYS = 14;        // EU acts are dated before they appear in the repository
const MAX_BOE_BACKFILL_DAYS = 7;

const changes = () => db().collection('legal_changes');
const seen = () => db().collection('legal_seen');
const nowIso = () => new Date().toISOString();

function openai(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new LegalError('El análisis no está disponible ahora mismo.', 'ai_unavailable', 503);
  return new OpenAI({ apiKey });
}

async function jsonCall(system: string, user: string, schema: { name: string; strict: boolean; schema: unknown }, maxTokens: number): Promise<unknown> {
  const r = await openai().chat.completions.create({
    model: MODEL, temperature: 0, max_tokens: maxTokens,
    response_format: { type: 'json_schema', json_schema: schema as unknown as { name: string; strict: boolean; schema: Record<string, unknown> } },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  try { return JSON.parse(r.choices[0]?.message?.content ?? 'null'); } catch { return null; }
}

async function analyze(title: string, text: string): Promise<ChangeAnalysis | null> {
  return parseAnalysis(await jsonCall(ANALYSIS_SYSTEM_PROMPT, `Título: ${title}\n\n${text}`, ANALYSIS_JSON_SCHEMA, 2000));
}

// ── Daily monitor ───────────────────────────────────────────────

export interface MonitorResult {
  skipped: boolean; fetched: number; fresh: number; triagedRelevant: number; created: number; deferred: number; errors: string[];
}

/** Once per Madrid day (or `force`, admin "Buscar ahora"). `days` widens the BOE window on demand. */
export async function runLegalMonitor(opts: { now?: Date; force?: boolean; days?: number } = {}): Promise<MonitorResult> {
  const today = madridToday(opts.now ?? new Date());
  const marker = db().collection('system').doc('legal_monitor');
  const prev = await db().runTransaction(async tx => {
    const s = await tx.get(marker);
    if (!opts.force && s.get('lastRunOn') === today) return null;
    tx.set(marker, { lastRunOn: today, startedAt: nowIso() }, { merge: true });
    return s.data() ?? {};
  });
  const result: MonitorResult = { skipped: !prev, fetched: 0, fresh: 0, triagedRelevant: 0, created: 0, deferred: 0, errors: [] };
  if (!prev) return result;

  try {
    // BOE: every day since the last fetched one (max 7), or the last `days` days on demand.
    const lastBoe = isIsoDate(prev.lastBoeDate) ? prev.lastBoeDate as string : addDays(today, -1);
    let from = opts.days ? addDays(today, -(Math.min(opts.days, 30) - 1)) : addDays(lastBoe, 1);
    if (from < addDays(today, -(MAX_BOE_BACKFILL_DAYS - 1)) && !opts.days) from = addDays(today, -(MAX_BOE_BACKFILL_DAYS - 1));
    const items: FeedItem[] = [];
    let boeOk = true;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      try { items.push(...await fetchBoeDay(d)); } catch (e) { boeOk = false; result.errors.push((e as Error).message); }
    }
    try { items.push(...await fetchEurLex(addDays(today, -EU_WINDOW_DAYS), today)); } catch (e) { result.errors.push((e as Error).message); }
    result.fetched = items.length;

    // Skip what was already triaged.
    const ids = items.map(i => changeDocId(i.source, i.externalId));
    const known = new Set<string>();
    for (let i = 0; i < ids.length; i += 100) {
      const snaps = await db().getAll(...ids.slice(i, i + 100).map(id => seen().doc(id)));
      snaps.forEach(s => { if (s.exists) known.add(s.id); });
    }
    const fresh = items.filter((_, i) => !known.has(ids[i]));
    result.fresh = fresh.length;

    // 1) Title triage in batches.
    const relevant: { item: FeedItem; topics: string[]; rationale: string; confidence: number }[] = [];
    for (let i = 0; i < fresh.length; i += TRIAGE_BATCH) {
      const batch = fresh.slice(i, i + TRIAGE_BATCH);
      const verdicts = parseTriage(await jsonCall(TRIAGE_SYSTEM_PROMPT, triageUserMessage(batch), TRIAGE_JSON_SCHEMA, 4000), batch.length);
      const w = db().batch();
      batch.forEach((item, j) => {
        const v = verdicts[j];
        if (v.relevant) relevant.push({ item, ...v });
        // Relevant ones are marked seen only once analysed (below), so a capped run retries them tomorrow.
        else w.set(seen().doc(changeDocId(item.source, item.externalId)), { relevant: false, title: item.title.slice(0, 300), rationale: v.rationale, at: nowIso() });
      });
      await w.commit();
    }
    result.triagedRelevant = relevant.length;

    // 2) Full-text analysis of the relevant ones (capped per run).
    for (const [n, r] of relevant.entries()) {
      if (n >= MAX_ANALYSES_PER_RUN) { result.deferred++; continue; }
      const id = changeDocId(r.item.source, r.item.externalId);
      try {
        const { text, effectiveFrom } = await fetchItemText(r.item);
        const a = await analyze(r.item.title, text);
        if (a?.relevant) {
          await changes().doc(id).create(changeRecord({
            source: r.item.source, externalId: r.item.externalId, url: r.item.url, title: r.item.title,
            publishedAt: r.item.publishedAt, jurisdiction: r.item.jurisdiction,
          }, a, effectiveFrom, { relevant: true, rationale: r.rationale, confidence: r.confidence })).catch(() => {});
          result.created++;
        }
        await seen().doc(id).set({ relevant: !!a?.relevant, title: r.item.title.slice(0, 300), rationale: r.rationale, at: nowIso() });
      } catch (e) {
        result.errors.push(`${r.item.externalId}: ${(e as Error).message}`);
      }
    }

    // Store yesterday: today's issue may not have been published yet, so tomorrow's run fetches it
    // again (already-triaged items are skipped through legal_seen).
    await marker.set({ ...(boeOk ? { lastBoeDate: addDays(today, -1) } : {}), lastResult: { ...result, at: nowIso() } }, { merge: true });
    return result;
  } catch (err) {
    if (!opts.force) await marker.set({ lastRunOn: null }, { merge: true }).catch(() => {});
    throw err;
  }
}

function changeRecord(
  base: Pick<LegalChange, 'source' | 'externalId' | 'url' | 'title' | 'publishedAt' | 'jurisdiction'>,
  a: ChangeAnalysis, effectiveFrom: string | null, triage: { relevant: boolean; rationale: string; confidence: number },
): Omit<LegalChange, 'id'> {
  const at = nowIso();
  return {
    ...base,
    effectiveFrom: effectiveFrom ?? a.effectiveFrom,
    contractTypes: a.contractTypes,
    topics: a.topics,
    clauseKeys: a.clauseKeys,
    summary: a.summary,
    requirement: a.requirement,
    severity: a.severity,
    suggestedClause: a.suggestedClause,
    aiTriage: { ...triage, model: MODEL },
    status: 'new',
    approvedBy: null, approvedAt: null, dismissedAt: null,
    createdAt: at, updatedAt: at,
  };
}

// ── Admin actions ───────────────────────────────────────────────

async function loadChange(id: string): Promise<LegalChange> {
  const s = await changes().doc(id).get();
  if (!s.exists) throw new LegalError('Cambio no encontrado.', 'not_found', 404);
  return { id: s.id, ...(s.data() as Omit<LegalChange, 'id'>) };
}

export async function addManualChange(input: { title: string; url?: string; text: string; jurisdiction: LegalJurisdiction; publishedAt?: string }): Promise<LegalChange> {
  const a = await analyze(input.title, input.text.slice(0, 30_000));
  if (!a) throw new LegalError('No pudimos analizar el texto. Revisa que sea la norma completa.', 'ai_error', 502);
  const ref = changes().doc();
  const rec = changeRecord({
    source: 'manual', externalId: `manual-${ref.id}`, url: input.url ?? '', title: input.title.trim().slice(0, 500),
    publishedAt: isIsoDate(input.publishedAt) ? input.publishedAt : madridToday(), jurisdiction: input.jurisdiction,
  }, a, null, { relevant: a.relevant, rationale: 'Añadido manualmente', confidence: 1 });
  await ref.set(rec);
  return { id: ref.id, ...rec };
}

export async function editChange(id: string, e: ChangeEdit): Promise<LegalChange> {
  const c = await loadChange(id);
  if (c.status === 'dismissed') throw new LegalError('Este cambio está descartado.', 'dismissed', 409);
  const patch: Record<string, unknown> = { updatedAt: nowIso() };
  for (const k of ['title', 'summary', 'requirement', 'severity', 'suggestedClause', 'topics', 'effectiveFrom', 'jurisdiction'] as const) {
    if (e[k] !== undefined) patch[k] = e[k];
  }
  await changes().doc(id).update(patch);
  return { ...c, ...patch } as LegalChange;
}

export async function dismissChange(id: string): Promise<void> {
  const c = await loadChange(id);
  if (c.status === 'approved') throw new LegalError('Un cambio aprobado no se puede descartar.', 'approved', 409);
  await changes().doc(id).update({ status: 'dismissed', dismissedAt: nowIso(), updatedAt: nowIso() });
}

/** L1: only an admin's approval makes a change count. Flags affected NDAs and notifies their owners. */
export async function approveChange(adminUid: string, id: string): Promise<{ flagged: number; users: number }> {
  const c = await loadChange(id);
  if (c.status === 'dismissed') throw new LegalError('Este cambio está descartado.', 'dismissed', 409);
  if (c.status !== 'approved') {
    await changes().doc(id).update({ status: 'approved', approvedBy: adminUid, approvedAt: nowIso(), updatedAt: nowIso() });
  }
  const r = await flagAffectedContracts({ ...c, status: 'approved' });
  await changes().doc(id).update({ flaggedContracts: r.flagged });
  return r;
}

async function flagAffectedContracts(ch: LegalChange): Promise<{ flagged: number; users: number }> {
  const snap = await db().collection('contracts').where('confirmedByUser', '==', true).where('lifecycle', 'in', OPEN_LIFECYCLES).get();
  const byUser = new Map<string, Contract[]>();
  for (const d of snap.docs) {
    const c = { id: d.id, ...(d.data() as Omit<Contract, 'id'>) } as Contract;
    if (isAffected(c, ch)) byUser.set(c.userId, [...(byUser.get(c.userId) ?? []), c]);
  }
  let flagged = 0, users = 0;
  for (const [uid, cs] of byUser) {
    const u = (await db().collection('users').doc(uid).get()).data() ?? {};
    if (!canUseContracts(u.plan as string | undefined, u.email as string | undefined)) continue;
    const batch = db().batch();
    for (const c of cs) {
      batch.update(db().collection('contracts').doc(c.id), {
        'legal.flaggedByChangeIds': FieldValue.arrayUnion(ch.id), 'legal.flaggedAt': nowIso(),
      });
      batch.update(db().collection('documents').doc(c.documentId), { contractLegalFlag: true });
    }
    await batch.commit().catch(err => console.warn('[legal] flag', uid, (err as Error).message));
    flagged += cs.length;
    users++;
    const n = cs.length;
    // One notification per user per change (deterministic id → re-approval doesn't duplicate).
    await db().collection('notifications').doc(changeDocId('legal', `${ch.id}_${uid}`)).create({
      userId: uid, type: 'legal_change', changeId: ch.id, contractIds: cs.map(c => c.id).slice(0, 50),
      title: `Cambio normativo: ${n} ${n === 1 ? 'NDA puede' : 'NDAs pueden'} requerir actualización`,
      body: `${ch.title.slice(0, 220)} — ${ch.requirement.slice(0, 280)}`,
      dueDate: ch.effectiveFrom ?? ch.publishedAt,
      severity: ch.severity === 'critical' ? 'high' : ch.severity === 'important' ? 'medium' : 'low',
      url: ch.url || null,
      readAt: null, emailed: false, createdAt: nowIso(),
    }).catch(() => {});
  }
  return { flagged, users };
}
