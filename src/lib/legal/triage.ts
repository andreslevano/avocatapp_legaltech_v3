// AI triage + analysis of legal changes (F2 step 1). Pure — unit tested.
//   1. Triage: one call per batch of feed titles → which ones may matter for NDAs.
//   2. Analysis: one call per relevant item with its full text → summary, requirement, suggested clause.
// Model output is always validated here; the admin approves before anything is used (L1).

import { isIsoDate } from '@/lib/contracts/dates';
import { CLAUSE_KEYS, type ClauseKey } from '@/lib/contracts/types';
import { LEGAL_TOPICS, type ChangeSeverity, type LegalTopic } from './types';

const nullable = (t: string) => ({ type: [t, 'null'] });

export const TRIAGE_SYSTEM_PROMPT = `Eres un abogado español experto en contratos de confidencialidad (NDA).
Recibes títulos de disposiciones publicadas hoy (BOE o Diario Oficial de la UE).
Marca relevant = true SOLO si la norma puede cambiar lo que un NDA debe o no debe contener, o la validez de sus cláusulas:
secretos empresariales, protección de datos personales, protección de informantes / canales de denuncia, pactos de confidencialidad
o no competencia laboral, uso de información en sistemas de IA, intercambio de datos (Data Act), ciberseguridad con deberes de
notificación, competencia desleal, propiedad intelectual/industrial ligada a información confidencial, contratación mercantil general.
Marca relevant = false para: nombramientos, subvenciones, ayudas, tarifas, presupuestos, aranceles, agricultura, pesca, registros de
productos o denominaciones, normas técnicas sectoriales, convocatorias, correcciones menores y actos de mera ejecución.
Ante la duda razonable, relevant = true con confidence baja. rationale: una frase en español.`;

export const TRIAGE_JSON_SCHEMA = {
  name: 'legal_triage',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['i', 'relevant', 'topics', 'rationale', 'confidence'],
          properties: {
            i: { type: 'integer' },
            relevant: { type: 'boolean' },
            topics: { type: 'array', items: { type: 'string', enum: [...LEGAL_TOPICS] } },
            rationale: { type: 'string' },
            confidence: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export interface TriageInput { title: string; department?: string; source: 'boe' | 'eurlex' }
export interface TriageVerdict { relevant: boolean; topics: LegalTopic[]; rationale: string; confidence: number }

export function triageUserMessage(items: TriageInput[]): string {
  return items.map((x, i) => `${i}. [${x.source === 'boe' ? 'BOE' : 'DOUE'}${x.department ? ` · ${x.department}` : ''}] ${x.title}`).join('\n');
}

const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const topicsOf = (v: unknown): LegalTopic[] =>
  [...new Set((Array.isArray(v) ? v : []).filter((t): t is LegalTopic => LEGAL_TOPICS.includes(t as LegalTopic)))];

/** Model output → one verdict per input index (missing indexes = not relevant). */
export function parseTriage(raw: unknown, count: number): TriageVerdict[] {
  const out: TriageVerdict[] = Array.from({ length: count }, () => ({ relevant: false, topics: [], rationale: '', confidence: 0 }));
  const items = (raw as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    const o = (it ?? {}) as Record<string, unknown>;
    const i = o.i;
    if (!Number.isInteger(i) || (i as number) < 0 || (i as number) >= count) continue;
    out[i as number] = { relevant: o.relevant === true, topics: topicsOf(o.topics), rationale: str(o.rationale, 300), confidence: clamp01(o.confidence) };
  }
  return out;
}

export const ANALYSIS_SYSTEM_PROMPT = `Eres un abogado español experto en NDAs. Analizas una disposición legal (BOE o Diario Oficial de la UE)
para saber si obliga a cambiar acuerdos de confidencialidad. Responde en español, claro y concreto, sin inventar artículos.
- relevant: false si, leído el texto, no afecta realmente a NDAs.
- summary: qué cambia (2-4 frases).
- requirement: qué debe (o no debe) contener ahora un NDA por esta norma (1-3 frases, accionable).
- clauseKeys: cláusulas del NDA afectadas.
- severity: critical (cláusula nula o ilegal si no se adapta), important (riesgo relevante), recommended (buena práctica).
- suggestedClause: redacción breve de cláusula para un NDA en español, o null si no procede.
- effectiveFrom: fecha de entrada en vigor YYYY-MM-DD si el texto la permite deducir, o null.
- contractTypes: tipos de contrato afectados.`;

export const ANALYSIS_JSON_SCHEMA = {
  name: 'legal_change_analysis',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['relevant', 'summary', 'requirement', 'topics', 'clauseKeys', 'severity', 'suggestedClause', 'effectiveFrom', 'contractTypes'],
    properties: {
      relevant: { type: 'boolean' },
      summary: { type: 'string' },
      requirement: { type: 'string' },
      topics: { type: 'array', items: { type: 'string', enum: [...LEGAL_TOPICS] } },
      clauseKeys: { type: 'array', items: { type: 'string', enum: [...CLAUSE_KEYS] } },
      severity: { type: 'string', enum: ['critical', 'important', 'recommended'] },
      suggestedClause: nullable('string'),
      effectiveFrom: nullable('string'),
      contractTypes: { type: 'array', items: { type: 'string', enum: ['nda', 'service', 'other'] } },
    },
  },
} as const;

export interface ChangeAnalysis {
  relevant: boolean;
  summary: string;
  requirement: string;
  topics: LegalTopic[];
  clauseKeys: ClauseKey[];
  severity: ChangeSeverity;
  suggestedClause: string | null;
  effectiveFrom: string | null;
  contractTypes: ('nda' | 'service' | 'other')[];
}

/** Validates the analysis; null when unusable (no summary / requirement). */
export function parseAnalysis(raw: unknown): ChangeAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const summary = str(r.summary, 1500);
  const requirement = str(r.requirement, 1000);
  if (!summary || !requirement) return null;
  const types = (Array.isArray(r.contractTypes) ? r.contractTypes : []).filter((t): t is 'nda' | 'service' | 'other' => t === 'nda' || t === 'service' || t === 'other');
  return {
    relevant: r.relevant === true,
    summary,
    requirement,
    topics: topicsOf(r.topics),
    clauseKeys: [...new Set((Array.isArray(r.clauseKeys) ? r.clauseKeys : []).filter((k): k is ClauseKey => CLAUSE_KEYS.includes(k as ClauseKey)))],
    severity: r.severity === 'critical' || r.severity === 'important' ? r.severity : 'recommended',
    suggestedClause: str(r.suggestedClause, 2000) || null,
    effectiveFrom: isIsoDate(r.effectiveFrom) ? r.effectiveFrom : null,
    contractTypes: types.length ? [...new Set(types)] : ['nda'],
  };
}

/** Stable Firestore id for a feed item (dedup across runs). */
export function changeDocId(source: string, externalId: string): string {
  return `${source}_${externalId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 140);
}
