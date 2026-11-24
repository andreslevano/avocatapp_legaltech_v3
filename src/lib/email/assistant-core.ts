// Revisión de Email — intelligent assistant: search plan → provider query, email clean-up, digest shape,
// digest → report markdown, and matching emails against Avocat's data. Pure, client-safe, unit tested.

import type { EmailMessage, EmailProvider } from './core';
import { nameScore } from '@/lib/clients/match';

export const MAX_ANALYSIS_EMAILS = 25;
export const MAX_CANDIDATES = 40;

// ── Search plan (from the AI) → provider query ──────────────────────────

export interface SearchPlan {
  /** People the search is about: matched as participants (from / to / cc), not anywhere in the text. */
  people: { name?: string; email?: string }[];
  /** Topic words or short phrases (OR-ed). */
  topics: string[];
  /** One line: what the user wants to know (shown above the results). */
  intent: string;
}

const q = (s: string) => s.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim();
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Sanitises the model's plan: at most 5 people and 8 topics, short strings. */
export function cleanPlan(raw: unknown, fallbackIntent = ''): SearchPlan {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const people = (Array.isArray(o.people) ? o.people : []).slice(0, 5).map(p => {
    const x = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const email = typeof x.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x.email.trim()) ? x.email.trim().toLowerCase() : undefined;
    const name = typeof x.name === 'string' ? q(x.name).slice(0, 80) : undefined;
    return { ...(name ? { name } : {}), ...(email ? { email } : {}) };
  }).filter(p => p.name || p.email);
  const topics = (Array.isArray(o.topics) ? o.topics : []).filter((t): t is string => typeof t === 'string')
    .map(t => q(t).slice(0, 60)).filter(Boolean).slice(0, 8);
  const intent = typeof o.intent === 'string' ? q(o.intent).slice(0, 200) : fallbackIntent.slice(0, 200);
  return { people, topics, intent };
}

/** Provider query from the plan + date filters. Outlook: KQL ($search); Gmail: q syntax. */
export function planQuery(provider: EmailProvider, p: SearchPlan, dates: { dateFrom?: string; dateTo?: string } = {}): string | null {
  const parts: string[] = [];
  const who = p.people.map(x => x.email ?? x.name!).filter(Boolean);
  if (provider === 'outlook') {
    if (who.length) parts.push(`(${who.map(w => `participants:"${q(w)}"`).join(' OR ')})`);
    if (p.topics.length) parts.push(`(${p.topics.map(t => (t.includes(' ') ? `"${q(t)}"` : q(t))).join(' OR ')})`);
    if (dates.dateFrom && ISO.test(dates.dateFrom)) parts.push(`received>=${dates.dateFrom}`);
    if (dates.dateTo && ISO.test(dates.dateTo)) parts.push(`received<=${dates.dateTo}`);
    return parts.length ? `"${parts.join(' AND ').replace(/"/g, "'")}"` : null;
  }
  if (who.length) parts.push(`{${who.flatMap(w => [`from:"${q(w)}"`, `to:"${q(w)}"`, `cc:"${q(w)}"`]).join(' ')}}`);
  if (p.topics.length) parts.push(`(${p.topics.map(t => (t.includes(' ') ? `"${q(t)}"` : q(t))).join(' OR ')})`);
  if (dates.dateFrom && ISO.test(dates.dateFrom)) parts.push(`after:${dates.dateFrom.replace(/-/g, '/')}`);
  if (dates.dateTo && ISO.test(dates.dateTo)) parts.push(`before:${dates.dateTo.replace(/-/g, '/')}`);
  return parts.join(' ') || 'in:inbox';
}

// ── Results: relevance + grouping by conversation ───────────────────────

export interface RankedEmail extends EmailMessage { score: number; reason: string }

/** Merges the model's scores (by index) into the list, best first; unscored keep their order at 50. */
export function applyRanking(list: EmailMessage[], ranking: unknown): RankedEmail[] {
  const r = Array.isArray(ranking) ? ranking : [];
  const by = new Map<number, { score: number; reason: string }>();
  for (const x of r) {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const i = Number(o.i);
    if (!Number.isInteger(i) || i < 0 || i >= list.length) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
    by.set(i, { score, reason: typeof o.reason === 'string' ? o.reason.slice(0, 160) : '' });
  }
  return list.map((m, i) => ({ ...m, score: by.get(i)?.score ?? 50, reason: by.get(i)?.reason ?? '' }))
    .map((m, i) => ({ m, i })).sort((a, b) => b.m.score - a.m.score || a.i - b.i).map(x => x.m);
}

export interface Thread { threadId: string; subject: string; emails: RankedEmail[]; score: number; last: string }

/** Conversations, best email first inside; threads ordered by their best score, then recency. */
export function groupThreads(list: RankedEmail[]): Thread[] {
  const map = new Map<string, Thread>();
  for (const m of list) {
    const t = map.get(m.threadId) ?? { threadId: m.threadId, subject: m.subject.replace(/^((re|rv|fw|fwd|reenviar)\s*:\s*)+/i, ''), emails: [], score: 0, last: '' };
    t.emails.push(m);
    t.score = Math.max(t.score, m.score);
    if (!t.last || Date.parse(m.date) > Date.parse(t.last)) t.last = m.date;
    map.set(m.threadId, t);
  }
  return [...map.values()].sort((a, b) => b.score - a.score || (Date.parse(b.last) || 0) - (Date.parse(a.last) || 0));
}

// ── Email text for the analysis ─────────────────────────────────────────

/** Drops quoted replies ("El … escribió:", "De: … Enviado:", "> …") and long signatures. */
export function stripQuoted(body: string, max = 4000): string {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (/^(El|On) .{5,120}(escribió|wrote):?$/i.test(t)) break;
    if (/^(De|From):\s.+/i.test(t) && out.some(x => x.trim())) break;
    if (/^-{2,}\s*(Original Message|Mensaje original)/i.test(t)) break;
    if (/^_{8,}$/.test(t)) break;
    if (t.startsWith('>')) continue;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

// ── Digest (what the analysis returns) ──────────────────────────────────

export interface Sourced { texto: string; fuentes: number[] }
export interface EmailDigest {
  resumen: string;
  cronologia: { fecha: string; quien: string; que: string; fuentes: number[] }[];
  temas: string[];
  puntosAtencion: Sourced[];
  fechas: { fecha: string; que: string; fuentes: number[] }[];
  acciones: { quien: string; que: string; cuando: string; fuentes: number[] }[];
  personas: { nombre: string; email: string; organizacion: string; rol: string }[];
  importes: { importe: string; concepto: string; fuentes: number[] }[];
  adjuntosRelevantes: { nombre: string; porque: string; fuentes: number[] }[];
  preguntasAbiertas: string[];
}

const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (v: unknown, max = 30) => (Array.isArray(v) ? v.slice(0, max) : []);
const srcs = (v: unknown, n: number) => arr(v, 10).map(Number).filter(x => Number.isInteger(x) && x >= 1 && x <= n);
const obj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;

/** Sanitises the model's digest; sources are 1-based email numbers (1..n). */
export function cleanDigest(raw: unknown, n: number): EmailDigest {
  const o = obj(raw);
  return {
    resumen: str(o.resumen, 3000),
    cronologia: arr(o.cronologia).map(x => ({ fecha: str(obj(x).fecha, 40), quien: str(obj(x).quien, 120), que: str(obj(x).que), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.que),
    temas: arr(o.temas, 15).map(x => str(x, 120)).filter(Boolean),
    puntosAtencion: arr(o.puntosAtencion).map(x => ({ texto: str(obj(x).texto), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.texto),
    fechas: arr(o.fechas).map(x => ({ fecha: str(obj(x).fecha, 40), que: str(obj(x).que), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.que),
    acciones: arr(o.acciones).map(x => ({ quien: str(obj(x).quien, 120), que: str(obj(x).que), cuando: str(obj(x).cuando, 60), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.que),
    personas: arr(o.personas, 40).map(x => ({ nombre: str(obj(x).nombre, 120), email: str(obj(x).email, 254).toLowerCase(), organizacion: str(obj(x).organizacion, 160), rol: str(obj(x).rol, 160) })).filter(x => x.nombre || x.email),
    importes: arr(o.importes).map(x => ({ importe: str(obj(x).importe, 60), concepto: str(obj(x).concepto), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.importe),
    adjuntosRelevantes: arr(o.adjuntosRelevantes).map(x => ({ nombre: str(obj(x).nombre, 200), porque: str(obj(x).porque), fuentes: srcs(obj(x).fuentes, n) })).filter(x => x.nombre),
    preguntasAbiertas: arr(o.preguntasAbiertas, 15).map(x => str(x)).filter(Boolean),
  };
}

export interface DigestSource { n: number; subject: string; from: string; date: string }

/** The report ("Generar informe"): markdown for buildDocHtml / saveAnalysisDocument. */
export function digestToMarkdown(d: EmailDigest, o: { purpose: string; account: string; sources: DigestSource[]; generatedAt?: Date }): string {
  const when = (o.generatedAt ?? new Date()).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const ref = (f: number[]) => (f.length ? ` *(email ${f.join(', ')})*` : '');
  const L: string[] = ['# INFORME DE REVISIÓN DE EMAILS', '', `**Objetivo:** ${o.purpose || 'Revisión de la conversación'}`, `**Buzón:** ${o.account} · **Emails analizados:** ${o.sources.length} · **Fecha:** ${when}`, ''];
  const sec = (title: string, items: string[]) => { if (items.length) L.push(`## ${title}`, '', ...items, ''); };
  if (d.resumen) L.push('## Resumen', '', d.resumen, '');
  sec('Temas', d.temas.map(t => `- ${t}`));
  sec('Puntos de atención', d.puntosAtencion.map(p => `- ${p.texto}${ref(p.fuentes)}`));
  sec('Fechas y plazos', d.fechas.map(f => `- **${f.fecha || 'Sin fecha'}** — ${f.que}${ref(f.fuentes)}`));
  sec('Acciones pendientes', d.acciones.map(a => `- **${a.quien || 'Sin asignar'}**: ${a.que}${a.cuando ? ` (${a.cuando})` : ''}${ref(a.fuentes)}`));
  sec('Cronología', d.cronologia.map(c => `- **${c.fecha}** · ${c.quien}: ${c.que}${ref(c.fuentes)}`));
  sec('Personas y organizaciones', d.personas.map(p => `- ${p.nombre}${p.email ? ` <${p.email}>` : ''}${p.organizacion ? ` · ${p.organizacion}` : ''}${p.rol ? ` — ${p.rol}` : ''}`));
  sec('Importes', d.importes.map(i => `- **${i.importe}** — ${i.concepto}${ref(i.fuentes)}`));
  sec('Adjuntos relevantes', d.adjuntosRelevantes.map(a => `- ${a.nombre}: ${a.porque}${ref(a.fuentes)}`));
  sec('Preguntas abiertas', d.preguntasAbiertas.map(p => `- ${p}`));
  sec('Emails analizados', o.sources.map(s => `${s.n}. ${s.subject} — ${s.from} (${s.date})`));
  L.push('*Informe generado con IA a partir de los emails indicados. Revísalo antes de usarlo.*');
  return L.join('\n');
}

// ── Matching with Avocat's data (deterministic; the UI proposes, the user decides) ──

const GENERIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es', 'live.com', 'live.es', 'msn.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com']);
export const domainOf = (email: string) => (email.split('@')[1] ?? '').toLowerCase();

export interface Participant { name: string; email: string }

/** "Ana Gil <ana@acme.es>, b@x.es" → participants (deduped by email). */
export function parseAddresses(s: string): Participant[] {
  const out: Participant[] = [];
  for (const part of s.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(part) ?? /^\s*()([^\s<>]+@[^\s<>]+)\s*$/.exec(part);
    if (!m) continue;
    const email = m[2].trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || out.some(p => p.email === email)) continue;
    out.push({ name: m[1].trim() || email, email });
  }
  return out;
}

export interface MatchClient { id: string; name: string; company?: string; email?: string }
export interface MatchCase { id: string; title: string; client?: string; clientId?: string; status?: string }
export interface MatchRecord { id: string; kind: 'negotiation' | 'signature' | 'contract'; title: string; emails: string[]; clientId?: string | null; href: string }

export type Suggestion =
  | { type: 'client'; clientId: string; label: string; reason: string }
  | { type: 'case'; caseId: string; label: string; reason: string }
  | { type: 'record'; kind: MatchRecord['kind']; id: string; label: string; href: string; reason: string }
  | { type: 'new_client'; name: string; email: string; organization: string; reason: string };

/**
 * What the conversation may relate to in Avocat. `own`: the user's own addresses/domain (never matched).
 * Clients by exact email, then by company domain, then by name/organisation; cases through those clients
 * or by name in the title; NDAs / negotiations / signatures by the emails of their parties.
 */
export function matchContext(input: {
  participants: Participant[];
  organizations?: string[];
  own: { emails: string[]; domain?: string };
  clients: MatchClient[];
  cases: MatchCase[];
  records: MatchRecord[];
}): Suggestion[] {
  const ownEmails = new Set(input.own.emails.map(e => e.toLowerCase()));
  const ownDomain = (input.own.domain ?? '').toLowerCase();
  const people = input.participants.filter(p => !ownEmails.has(p.email) && domainOf(p.email) !== ownDomain);
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const add = (key: string, s: Suggestion) => { if (!seen.has(key)) { seen.add(key); out.push(s); } };

  const matchedClients = new Set<string>();
  for (const p of people) {
    const exact = input.clients.find(c => (c.email ?? '').toLowerCase() === p.email);
    const dom = domainOf(p.email);
    const byDomain = !exact && !GENERIC_DOMAINS.has(dom) ? input.clients.find(c => c.email && domainOf(c.email) === dom) : undefined;
    const byName = !exact && !byDomain ? input.clients.find(c => nameScore(p.name, c.name) >= 0.9 || (c.company ? nameScore(p.name, c.company) >= 0.9 : false)) : undefined;
    const c = exact ?? byDomain ?? byName;
    if (c) {
      matchedClients.add(c.id);
      add(`client:${c.id}`, { type: 'client', clientId: c.id, label: c.company || c.name,
        reason: exact ? `${p.email} es el email de este cliente` : byDomain ? `${p.email} es de su mismo dominio (@${dom})` : `${p.name} coincide con el cliente` });
    }
  }
  for (const org of input.organizations ?? []) {
    const c = input.clients.find(x => (x.company && nameScore(org, x.company) >= 0.9) || nameScore(org, x.name) >= 0.9);
    if (c) { matchedClients.add(c.id); add(`client:${c.id}`, { type: 'client', clientId: c.id, label: c.company || c.name, reason: `La conversación menciona a ${org}` }); }
  }
  for (const k of input.cases) {
    if (k.status === 'closed' || k.status === 'archived') continue;
    if (k.clientId && matchedClients.has(k.clientId)) {
      add(`case:${k.id}`, { type: 'case', caseId: k.id, label: k.title, reason: `Caso del cliente ${k.client ?? ''}`.trim() });
      continue;
    }
    const hit = people.find(p => p.name.length > 4 && (nameScore(p.name, k.client ?? '') >= 0.9 || k.title.toLowerCase().includes(p.name.toLowerCase())));
    if (hit) add(`case:${k.id}`, { type: 'case', caseId: k.id, label: k.title, reason: `${hit.name} aparece en el caso` });
  }
  const emails = new Set(people.map(p => p.email));
  for (const r of input.records) {
    const who = r.emails.map(e => e.toLowerCase()).find(e => emails.has(e));
    if (who || (r.clientId && matchedClients.has(r.clientId))) {
      add(`${r.kind}:${r.id}`, { type: 'record', kind: r.kind, id: r.id, label: r.title, href: r.href,
        reason: who ? `${who} es parte de este ${r.kind === 'negotiation' ? 'NDA en negociación' : r.kind === 'signature' ? 'envío a firma' : 'contrato'}` : 'Del mismo cliente' });
    }
  }
  // External people not linked to any client: offer to create them (business domains first).
  const linked = new Set(input.clients.map(c => (c.email ?? '').toLowerCase()));
  for (const p of people) {
    if (linked.has(p.email)) continue;
    const dom = domainOf(p.email);
    if (!GENERIC_DOMAINS.has(dom) && input.clients.some(c => c.email && domainOf(c.email) === dom)) continue;
    add(`new:${p.email}`, { type: 'new_client', name: p.name, email: p.email, organization: GENERIC_DOMAINS.has(dom) ? '' : dom, reason: 'Participa en la conversación y no está en tus clientes' });
    if (out.filter(s => s.type === 'new_client').length >= 3) break;
  }
  return out;
}
