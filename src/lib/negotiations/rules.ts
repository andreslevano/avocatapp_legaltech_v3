// NDA negotiation — validation of the other party's review and the owner's response, clause state
// transitions and when the negotiation is agreed. Pure, client-safe (the public page and the owner
// page validate with the same functions the server applies). Unit tested.

import { cleanValue } from '@/lib/data-requests/core';
import { levelAllows } from './levels';
import type { ClauseComment, NegClause, Negotiation, NegotiationStatus, Turn } from './types';

export const CLAUSE_TEXT_MAX = 4000;
export const NOTE_MAX = 1000;
export const NEGOTIATION_TTL_DAYS = 14;

// ── Text cleaning ───────────────────────────────────────────────────

/**
 * Clause wording proposed by a party. Multi-line, but no markdown structure that could leave the
 * clause: headings ("## CLÁUSULA …", "## FIRMAS"), quotes, rules, tables, numbered-list markers and
 * "____" signature anchors are removed. "- " bullets (clause 2 has them) and **bold** are kept.
 */
export function cleanClauseText(raw: unknown, max = CLAUSE_TEXT_MAX): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n')
    .map(line => {
      let l = line
        .replace(/_{2,}/g, ' ')
        .replace(/[`|~<>\\]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
      // Repeat: "> ## x" or "# - x" must not survive as a heading after one pass.
      for (let prev = ''; prev !== l;) {
        prev = l;
        l = l.replace(/^#+\s*/, '').replace(/^(?:[-*+=]\s*){3,}$/, '').replace(/^\d+[.)]\s+/, '').replace(/^[*+]\s+/, '- ').trim();
      }
      return l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
    .trim();
}

/** Comments and reasons: one line, same cleaning as data-request fields. */
export const cleanNote = (raw: unknown) => cleanValue(raw, NOTE_MAX);

// ── Status ──────────────────────────────────────────────────────────

type StatusInput = Pick<Negotiation, 'status' | 'expiresAt'>;

/** Stored status, with "caducada" once the link expired while it was the other party's turn. */
export function effectiveStatus(n: StatusInput, now: Date = new Date()): NegotiationStatus {
  if (n.status === 'en_revision' && n.expiresAt <= now.toISOString()) return 'caducada';
  return n.status;
}

/** What the other party's link shows. */
export type LinkState = 'abierta' | 'no_es_tu_turno' | 'acordado' | 'caducada' | 'revocada' | 'cerrada';

export function linkState(n: StatusInput, now: Date = new Date()): LinkState {
  const s = effectiveStatus(n, now);
  if (s === 'en_revision') return 'abierta';
  if (s === 'cambios_propuestos') return 'no_es_tu_turno';
  return s;
}

/** Only an open link shows clause text (expired, revoked, closed, agreed or not-your-turn: a message). */
export const linkShowsClauses = (s: LinkState) => s === 'abierta';

export function expiryFrom(now: Date, days = NEGOTIATION_TTL_DAYS): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

/** Status and turn after a submission (or an owner response). */
export function nextStatus(by: 'tercero' | 'propietario', clauses: Pick<NegClause, 'state'>[]): { status: NegotiationStatus; turn: Turn | null } {
  if (by === 'propietario') return { status: 'en_revision', turn: 'tercero' };
  return clauses.every(c => c.state === 'aceptada')
    ? { status: 'acordado', turn: null }
    : { status: 'cambios_propuestos', turn: 'propietario' };
}

/** Clauses the other party still has to review in this round. */
export const needsReview = (c: Pick<NegClause, 'state'>) => c.state === 'pendiente' || c.state === 'propuesta' || c.state === 'comentada';

// ── Other party ─────────────────────────────────────────────────────

export type ThirdAction = 'acepto' | 'propongo' | 'comento';
export interface ThirdItem { key: string; action: ThirdAction; text?: string; reason?: string }

export type Fail = { ok: false; error: string; code: 'turn' | 'invalid_input'; errors?: Record<string, string> };

export interface ThirdOutcome {
  ok: true;
  clauses: NegClause[];
  status: NegotiationStatus;
  turn: Turn | null;
  counts: { accepted: number; proposals: number; comments: number };
}

type NegState = Pick<Negotiation, 'status' | 'turn' | 'clauses' | 'round' | 'expiresAt'>;

/** Validates and applies the other party's review ("Enviar propuesta" / "Acepto el borrador completo"). */
export function applyThirdParty(n: NegState, body: unknown, at: string = new Date().toISOString()): ThirdOutcome | Fail {
  if (effectiveStatus(n, new Date(at)) !== 'en_revision' || n.turn !== 'tercero') {
    return { ok: false, code: 'turn', error: 'Ahora no es tu turno: la otra parte está revisando el documento.' };
  }
  const b = (body && typeof body === 'object' ? body : {}) as { items?: unknown; acceptAll?: unknown };
  const rawItems = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
  const acceptAll = b.acceptAll === true;
  const byKey = new Map(n.clauses.map(c => [c.key, c]));
  const errors: Record<string, string> = {};
  const items = new Map<string, ThirdItem>();

  for (const raw of rawItems) {
    const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const key = typeof it.key === 'string' ? it.key : '';
    const c = byKey.get(key);
    if (!c) return { ok: false, code: 'invalid_input', error: 'Cláusula desconocida.' };
    if (items.has(key)) return { ok: false, code: 'invalid_input', error: 'Una sola respuesta por cláusula.' };
    const action = it.action;
    if (action === 'acepto') { items.set(key, { key, action }); continue; }
    if (action === 'comento') {
      const text = cleanNote(it.text);
      if (!text) errors[key] = 'Escribe tu comentario.';
      items.set(key, { key, action, text });
      continue;
    }
    if (action === 'propongo') {
      const rule = levelAllows(c.level);
      if (!rule.propose) { errors[key] = 'Esta cláusula no se puede modificar: solo aceptarla o comentarla.'; continue; }
      const text = cleanClauseText(it.text);
      const reason = cleanNote(it.reason);
      if (!text) errors[key] = 'Escribe la redacción que propones.';
      else if (text === c.current) errors[key] = 'La redacción propuesta es igual a la actual.';
      else if (rule.reasonRequired && !reason) errors[key] = 'Explica el motivo del cambio: es una cláusula negociable.';
      items.set(key, { key, action, text, reason });
      continue;
    }
    return { ok: false, code: 'invalid_input', error: 'Acción no válida.' };
  }
  if (Object.keys(errors).length) return { ok: false, code: 'invalid_input', error: 'Revisa las cláusulas marcadas.', errors };

  const open = [...items.values()].filter(i => i.action !== 'acepto');
  if (acceptAll && open.length) {
    return { ok: false, code: 'invalid_input', error: 'Para aceptar el borrador completo no puede haber cambios ni comentarios.' };
  }
  if (!acceptAll) {
    const missing = n.clauses.filter(c => needsReview(c) && !items.has(c.key));
    if (missing.length) {
      return {
        ok: false, code: 'invalid_input', error: `Te falta revisar ${missing.length === 1 ? 'una cláusula' : `${missing.length} cláusulas`}.`,
        errors: Object.fromEntries(missing.map(c => [c.key, 'Acepta, propón un cambio o comenta esta cláusula.'])),
      };
    }
  }

  const clauses = n.clauses.map((c): NegClause => {
    const it = acceptAll ? { key: c.key, action: 'acepto' as const } : items.get(c.key);
    const base = { ...c, ownerDecision: null, proposal: null };
    if (!it) return { ...base, state: c.state === 'resuelta' ? 'aceptada' : c.state };
    if (it.action === 'acepto') return { ...base, state: 'aceptada' };
    if (it.action === 'comento') {
      return { ...base, state: 'comentada', comments: [...c.comments, { by: 'tercero', text: it.text!, at, round: n.round }] };
    }
    return { ...base, state: 'propuesta', proposal: { text: it.text!, reason: it.reason ?? '', at, round: n.round } };
  });
  const next = nextStatus('tercero', clauses);
  return {
    ok: true, clauses, ...next,
    counts: {
      accepted: clauses.filter(c => c.state === 'aceptada').length,
      proposals: clauses.filter(c => c.state === 'propuesta').length,
      comments: clauses.filter(c => c.state === 'comentada').length,
    },
  };
}

// ── Owner ───────────────────────────────────────────────────────────

export type OwnerAction = 'aceptar' | 'rechazar' | 'contrapropuesta';
export interface OwnerDecisionInput { key: string; action: OwnerAction; text?: string; reason?: string }

export interface OwnerOutcome {
  ok: true;
  clauses: NegClause[];
  status: NegotiationStatus;
  turn: Turn | null;
  /** Keys whose text in force changed. */
  changed: string[];
  counts: { decisions: number; replies: number };
}

/** Clauses waiting for the owner: proposals (decision required) and comments (reply optional). */
export const awaitsOwner = (c: Pick<NegClause, 'state'>) => c.state === 'propuesta' || c.state === 'comentada';

export function applyOwnerResponse(n: NegState, body: unknown, at: string = new Date().toISOString()): OwnerOutcome | Fail {
  if (n.status !== 'cambios_propuestos' || n.turn !== 'propietario') {
    return { ok: false, code: 'turn', error: 'Ahora no es tu turno: la otra parte está revisando el documento.' };
  }
  const b = (body && typeof body === 'object' ? body : {}) as { decisions?: unknown; replies?: unknown };
  const byKey = new Map(n.clauses.map(c => [c.key, c]));
  const errors: Record<string, string> = {};
  const decisions = new Map<string, OwnerDecisionInput>();
  const replies = new Map<string, string>();

  for (const raw of Array.isArray(b.decisions) ? b.decisions.slice(0, 200) : []) {
    const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const key = typeof d.key === 'string' ? d.key : '';
    const c = byKey.get(key);
    if (!c || c.state !== 'propuesta') return { ok: false, code: 'invalid_input', error: 'Solo se responde a cláusulas con un cambio propuesto.' };
    if (decisions.has(key)) return { ok: false, code: 'invalid_input', error: 'Una sola decisión por cláusula.' };
    const reason = cleanNote(d.reason);
    if (d.action === 'aceptar') decisions.set(key, { key, action: 'aceptar' });
    else if (d.action === 'rechazar') {
      if (!reason) errors[key] = 'Explica por qué rechazas el cambio.';
      decisions.set(key, { key, action: 'rechazar', reason });
    } else if (d.action === 'contrapropuesta') {
      const text = cleanClauseText(d.text);
      if (!text) errors[key] = 'Escribe tu contrapropuesta.';
      else if (text === c.current) errors[key] = 'La contrapropuesta es igual al texto actual.';
      decisions.set(key, { key, action: 'contrapropuesta', text, reason });
    } else return { ok: false, code: 'invalid_input', error: 'Acción no válida.' };
  }
  for (const raw of Array.isArray(b.replies) ? b.replies.slice(0, 200) : []) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const key = typeof r.key === 'string' ? r.key : '';
    const c = byKey.get(key);
    if (!c || !awaitsOwner(c)) return { ok: false, code: 'invalid_input', error: 'Solo se responde a cláusulas comentadas o con cambios.' };
    const text = cleanNote(r.text);
    if (text) replies.set(key, text);
  }
  for (const c of n.clauses) if (c.state === 'propuesta' && !decisions.has(c.key)) errors[c.key] = 'Acepta, rechaza o contrapropón este cambio.';
  if (Object.keys(errors).length) return { ok: false, code: 'invalid_input', error: 'Revisa las cláusulas marcadas.', errors };

  const changed: string[] = [];
  const clauses = n.clauses.map((c): NegClause => {
    const reply = replies.get(c.key);
    const comments: ClauseComment[] = reply ? [...c.comments, { by: 'propietario', text: reply, at, round: n.round }] : c.comments;
    if (c.state === 'comentada') return { ...c, comments, state: 'pendiente' };
    if (c.state !== 'propuesta') return { ...c, comments };
    const d = decisions.get(c.key)!;
    const decision = { action: d.action, at, round: n.round, ...(d.text ? { text: d.text } : {}), ...(d.reason ? { reason: d.reason } : {}) };
    if (d.action === 'aceptar') {
      changed.push(c.key);
      // Their own wording, accepted: agreed unless they reopen it in the next round.
      return { ...c, comments, current: c.proposal!.text, state: 'resuelta', ownerDecision: decision };
    }
    if (d.action === 'contrapropuesta') {
      changed.push(c.key);
      return { ...c, comments, current: d.text!, state: 'pendiente', ownerDecision: decision };
    }
    return { ...c, comments, state: 'pendiente', ownerDecision: decision };
  });
  return { ok: true, clauses, ...nextStatus('propietario', clauses), changed, counts: { decisions: decisions.size, replies: replies.size } };
}
