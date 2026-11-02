// NDA legal check (F2 step 2). Pure — unit tested.
// Each NDA is checked against (L2) the approved changes in force after its start date that apply to
// its jurisdiction and type, plus the active baseline items for that jurisdiction. One LLM call per
// NDA returns one finding per rule; it is validated here and turned into a verdict.

import type { Contract } from '@/lib/contracts/types';
import type { BaselineItem } from './baseline';
import { changeAppliesTo, type ChangeSeverity, type LegalChange } from './types';

export type FindingStatus = 'ok' | 'not_applicable' | 'missing' | 'conflict';
export type CheckVerdict = 'ok' | 'review' | 'outdated' | 'no_rules';

export interface CheckRule {
  id: string;                        // legal_changes id, or "baseline:<id>"
  kind: 'change' | 'baseline';
  title: string;
  url: string;
  requirement: string;
  severity: ChangeSeverity;
  suggestedClause: string | null;
  validatedByLawyer: boolean;        // changes are admin-approved; baseline items need a lawyer's tick
}

export interface CheckFinding {
  ruleId: string;
  kind: 'change' | 'baseline';
  title: string;
  url: string;
  severity: ChangeSeverity;
  status: FindingStatus;
  explanation: string;
  excerpt: string | null;
  suggestedClause: string | null;
}

export const VERDICT_LABEL: Record<CheckVerdict, string> = {
  ok: 'Al día', review: 'Revisar', outdated: 'Desactualizado', no_rules: 'Sin normas aplicables',
};

/** The rules that apply to a contract (L2). */
export function applicableRules(
  c: Pick<Contract, 'type' | 'jurisdiction' | 'dates'>,
  changes: Pick<LegalChange, 'id' | 'status' | 'jurisdiction' | 'contractTypes' | 'effectiveFrom' | 'publishedAt' | 'title' | 'url' | 'requirement' | 'severity' | 'suggestedClause'>[],
  baseline: Pick<BaselineItem, 'id' | 'active' | 'jurisdiction' | 'contractTypes' | 'title' | 'url' | 'requirement' | 'severity' | 'suggestedClause' | 'validatedByLawyer'>[],
): CheckRule[] {
  const country = c.jurisdiction?.country;
  const start = c.dates?.effectiveDate ?? null;
  const rules: CheckRule[] = [];
  for (const b of baseline) {
    if (!b.active || !(b.contractTypes ?? ['nda']).includes(c.type) || !changeAppliesTo(b.jurisdiction, country)) continue;
    rules.push({ id: `baseline:${b.id}`, kind: 'baseline', title: b.title, url: b.url, requirement: b.requirement, severity: b.severity, suggestedClause: b.suggestedClause, validatedByLawyer: b.validatedByLawyer });
  }
  for (const ch of changes) {
    if (ch.status !== 'approved' || !(ch.contractTypes?.length ? ch.contractTypes : ['nda']).includes(c.type)) continue;
    if (!changeAppliesTo(ch.jurisdiction, country)) continue;
    const inForce = ch.effectiveFrom ?? ch.publishedAt;
    if (start && inForce && inForce < start) continue;           // in force before the NDA: baseline covers current law
    rules.push({ id: ch.id, kind: 'change', title: ch.title, url: ch.url, requirement: ch.requirement, severity: ch.severity, suggestedClause: ch.suggestedClause, validatedByLawyer: true });
  }
  return rules;
}

export const CHECK_SYSTEM_PROMPT = `Eres un abogado español que revisa un acuerdo de confidencialidad (NDA) frente a una lista de requisitos legales.
Para CADA requisito devuelve un hallazgo con su ruleId exacto:
- ok: el NDA lo cumple.
- not_applicable: el requisito no aplica a este NDA (explica por qué en una frase; p. ej. no hay trabajadores, no hay datos personales).
- missing: el NDA no contiene lo que exige el requisito.
- conflict: el NDA contiene una cláusula que contradice el requisito.
explanation: 1-2 frases en español, concretas. excerpt: cita literal breve del NDA (máx. 300 caracteres) que justifica el hallazgo, o null si falta.
No inventes contenido del NDA; si no aparece, es missing.`;

export const CHECK_JSON_SCHEMA = {
  name: 'nda_legal_check',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['findings'],
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['ruleId', 'status', 'explanation', 'excerpt'],
          properties: {
            ruleId: { type: 'string' },
            status: { type: 'string', enum: ['ok', 'not_applicable', 'missing', 'conflict'] },
            explanation: { type: 'string' },
            excerpt: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
} as const;

export function checkUserMessage(ndaTitle: string, ndaText: string, rules: CheckRule[]): string {
  return [
    'REQUISITOS:',
    ...rules.map(r => `- ruleId: ${r.id}\n  ${r.title}\n  Requisito: ${r.requirement}`),
    '',
    `NDA «${ndaTitle}»:`,
    ndaText,
  ].join('\n');
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Model output → one finding per rule. A rule the model skipped can't be trusted as "ok". */
export function parseCheck(raw: unknown, rules: CheckRule[]): { findings: CheckFinding[]; verdict: CheckVerdict } {
  if (!rules.length) return { findings: [], verdict: 'no_rules' };
  const got = new Map<string, Record<string, unknown>>();
  for (const f of (raw as { findings?: unknown[] })?.findings ?? []) {
    const o = (f ?? {}) as Record<string, unknown>;
    if (typeof o.ruleId === 'string' && !got.has(o.ruleId)) got.set(o.ruleId, o);
  }
  const findings: CheckFinding[] = rules.map(r => {
    const o = got.get(r.id);
    const status: FindingStatus = o && ['ok', 'not_applicable', 'missing', 'conflict'].includes(o.status as string)
      ? o.status as FindingStatus : 'missing';
    const bad = status === 'missing' || status === 'conflict';
    return {
      ruleId: r.id, kind: r.kind, title: r.title, url: r.url, severity: r.severity, status,
      explanation: o ? str(o.explanation, 600) : 'No se pudo evaluar este requisito; revísalo manualmente.',
      excerpt: o ? str(o.excerpt, 300) || null : null,
      suggestedClause: bad ? r.suggestedClause : null,
    };
  });
  return { findings, verdict: verdictOf(findings) };
}

export function verdictOf(findings: Pick<CheckFinding, 'status' | 'severity'>[]): CheckVerdict {
  if (!findings.length) return 'no_rules';
  const bad = findings.filter(f => f.status === 'missing' || f.status === 'conflict');
  if (bad.some(f => f.severity === 'critical')) return 'outdated';
  return bad.length ? 'review' : 'ok';
}

/** Fixes passed to /tools/nda for "Generar versión actualizada" (bounded; the route re-validates). */
export function updateInstructions(findings: CheckFinding[]): string[] {
  return findings
    .filter(f => f.status === 'missing' || f.status === 'conflict')
    .slice(0, 10)
    .map(f => (f.suggestedClause
      ? `${f.explanation} Incluye una cláusula como: «${f.suggestedClause}»`
      : f.explanation).slice(0, 800));
}

/** Per-user daily cap on checks (cost control). */
export const MAX_CHECKS_PER_DAY = 200;
