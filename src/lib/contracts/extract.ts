// Building contract records (F0). Pure — unit tested.
//   • from the /tools/nda form (no LLM, confidence 1, confirmed)
//   • from an LLM structured extraction (JSON schema + validation here; never trust raw model text)

import { computeDates, isIsoDate, parseDuration } from './dates';
import {
  CLAUSE_KEYS, countryCode,
  type ClauseKey, type Contract, type ContractClause, type ContractParty, type ContractTerm, type ContractType, type NdaKind, type PartyRole,
} from './types';

export type NewContract = Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>;

// ── From the NDA form ────────────────────────────────────────────

export interface NdaFormParty { nombre: string; empresa?: string; cargo?: string; idType?: string; idNumber?: string; email?: string }
export interface NdaFormInput {
  documentId: string;
  title: string;
  tipo: NdaKind;
  language: 'es' | 'en';
  divulgante: NdaFormParty;
  receptora: NdaFormParty;
  objeto?: string;
  duracion: string;
  jurisdiccion: string;
  ciudadJurisdiccion?: string;
  noCompetencia?: boolean;
  penalizacion?: boolean;
  clientId?: string | null;
  renewsContractId?: string | null;
  /** F2: an updated version after a legal check replaces the old one ("Sustituido", not "Renovado"). */
  supersedes?: boolean;
}

const clean = (s: unknown, max = 200) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const party = (p: NdaFormParty, role: PartyRole): ContractParty => ({
  name: clean(p.nombre), company: clean(p.empresa) || null, role,
  idType: clean(p.idType, 20) || null, idNumber: clean(p.idNumber, 40) || null, email: clean(p.email, 200) || null,
});

export function contractFromNdaForm(f: NdaFormInput, uid: string, today: string): NewContract {
  const { months, indefinite } = parseDuration(f.duracion);
  const term: ContractTerm = { durationText: clean(f.duracion, 120) || null, months, indefinite };
  const bilateral = f.tipo === 'bilateral';
  const clauses: ContractClause[] = [
    ...(['definition_confidential_info', 'exclusions', 'return_destruction', 'governing_law', 'jurisdiction_forum', 'term'] as ClauseKey[])
      .map(key => ({ key, present: true })),
    { key: 'non_compete', present: !!f.noCompetencia },
    { key: 'penalty', present: !!f.penalizacion },
  ];
  return {
    userId: uid,
    documentId: f.documentId,
    caseId: null,
    clientId: f.clientId ?? null,
    type: 'nda',
    title: clean(f.title, 160) || 'NDA',
    purpose: clean(f.objeto, 1000) || null,
    language: f.language === 'en' ? 'en' : 'es',
    jurisdiction: { country: countryCode(f.jurisdiccion), region: clean(f.ciudadJurisdiccion, 80) || null },
    governingLaw: clean(f.jurisdiccion, 80) || null,
    ndaKind: bilateral ? 'bilateral' : 'unilateral',
    parties: [party(f.divulgante, bilateral ? 'mutual' : 'disclosing'), party(f.receptora, bilateral ? 'mutual' : 'receiving')],
    term,
    dates: computeDates(today, term),
    clauses,
    extraction: { source: 'generated', confidence: 1, fieldConfidence: {}, extractedAt: new Date().toISOString() },
    confirmedByUser: true,
    confirmedAt: new Date().toISOString(),
    lifecycle: 'active',
    snoozedUntil: null,
    alertsMuted: false,
    renewsContractId: f.renewsContractId ?? null,
    renewedByContractId: null,
  };
}

// ── LLM extraction ───────────────────────────────────────────────

const nullable = (t: string) => ({ type: [t, 'null'] });

/** OpenAI structured-output schema (strict). */
export const EXTRACTION_JSON_SCHEMA = {
  name: 'contract_extraction',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['isContract', 'type', 'title', 'language', 'ndaKind', 'jurisdictionCountry', 'governingLaw', 'parties',
      'effectiveDate', 'termMonths', 'indefinite', 'termEndDate', 'autoRenewal', 'renewalMonths', 'noticeDays',
      'survivalMonths', 'clauses', 'confidence'],
    properties: {
      isContract: { type: 'boolean' },
      type: { type: 'string', enum: ['nda', 'service', 'other'] },
      title: { type: 'string' },
      language: { type: 'string', enum: ['es', 'en'] },
      ndaKind: { type: ['string', 'null'], enum: ['unilateral', 'bilateral', null] },
      jurisdictionCountry: { ...nullable('string'), description: 'ISO 3166 alpha-2 of the governing law (ES, CL, CO…), EU, or null' },
      governingLaw: nullable('string'),
      parties: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['name', 'company', 'role'],
          properties: {
            name: { type: 'string' }, company: nullable('string'),
            role: { type: 'string', enum: ['disclosing', 'receiving', 'mutual'] },
          },
        },
      },
      effectiveDate: { ...nullable('string'), description: 'YYYY-MM-DD; signature date if no explicit effective date' },
      termMonths: { ...nullable('integer'), description: 'Duration of the agreement in months' },
      indefinite: { type: 'boolean' },
      termEndDate: { ...nullable('string'), description: 'YYYY-MM-DD only if an explicit end date is written' },
      autoRenewal: { type: 'boolean' },
      renewalMonths: nullable('integer'),
      noticeDays: { ...nullable('integer'), description: 'Days of notice to prevent renewal / terminate' },
      survivalMonths: { ...nullable('integer'), description: 'Months confidentiality survives after the term ends' },
      clauses: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['key', 'present', 'excerpt'],
          properties: { key: { type: 'string', enum: [...CLAUSE_KEYS] }, present: { type: 'boolean' }, excerpt: nullable('string') },
        },
      },
      confidence: {
        type: 'object', additionalProperties: false,
        required: ['effectiveDate', 'term', 'parties', 'jurisdiction', 'renewal', 'survival'],
        properties: Object.fromEntries(['effectiveDate', 'term', 'parties', 'jurisdiction', 'renewal', 'survival'].map(k => [k, { type: 'number' }])),
      },
    },
  },
} as const;

export const EXTRACTION_SYSTEM_PROMPT = `Eres un abogado que extrae datos estructurados de contratos (especialmente NDAs / acuerdos de confidencialidad).
Devuelve SOLO los datos que figuran en el texto; si un dato no aparece, usa null (no inventes fechas).
- effectiveDate: fecha de entrada en vigor; si no hay, la fecha de firma; si tampoco, null.
- termMonths: duración del acuerdo en meses (2 años = 24). indefinite = true si es indefinido o "mientras dure la relación".
- termEndDate: solo si el texto dice una fecha de fin explícita.
- survivalMonths: meses que la confidencialidad sobrevive tras terminar el acuerdo (p. ej. "durante 3 años tras su terminación" = 36).
- autoRenewal / renewalMonths / noticeDays: prórroga tácita o automática y preaviso para evitarla.
- confidence: 0..1 por campo; baja si el dato es ambiguo o deducido.
- clauses: una entrada por cada clave, present = si la cláusula existe, excerpt = frase breve (máx. 200 caracteres) o null.`;

const num = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null;
const conf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export interface ExtractionOutcome { contract: NewContract | null; reason?: 'not_contract' | 'invalid' }

/** Validates the model's JSON and builds an unconfirmed contract record. */
export function contractFromExtraction(raw: unknown, ctx: {
  uid: string; documentId: string; caseId: string | null; clientId: string | null; fallbackTitle: string; model: string;
}): ExtractionOutcome {
  if (!raw || typeof raw !== 'object') return { contract: null, reason: 'invalid' };
  const r = raw as Record<string, unknown>;
  if (r.isContract === false) return { contract: null, reason: 'not_contract' };

  const type: ContractType = r.type === 'nda' || r.type === 'service' ? r.type : 'other';
  const parties: ContractParty[] = (Array.isArray(r.parties) ? r.parties : []).slice(0, 6).flatMap(p => {
    const o = (p ?? {}) as Record<string, unknown>;
    const name = clean(o.name);
    if (!name) return [];
    const role: PartyRole = o.role === 'disclosing' || o.role === 'receiving' ? o.role : 'mutual';
    return [{ name, company: clean(o.company) || null, role }];
  });
  const clauses: ContractClause[] = (Array.isArray(r.clauses) ? r.clauses : []).flatMap(c => {
    const o = (c ?? {}) as Record<string, unknown>;
    if (!CLAUSE_KEYS.includes(o.key as ClauseKey)) return [];
    return [{ key: o.key as ClauseKey, present: o.present === true, excerpt: clean(o.excerpt, 200) || null }];
  });
  const indefinite = r.indefinite === true;
  const term: ContractTerm = {
    months: indefinite ? null : num(r.termMonths, 1, 1200),
    indefinite,
    fixedEndDate: isIsoDate(r.termEndDate) ? r.termEndDate : null,
    autoRenewal: r.autoRenewal === true,
    renewalMonths: num(r.renewalMonths, 1, 1200),
    noticeDays: num(r.noticeDays, 1, 3650),
    survivalMonths: num(r.survivalMonths, 1, 1200),
  };
  const effectiveDate = isIsoDate(r.effectiveDate) ? r.effectiveDate : null;
  const c = (r.confidence ?? {}) as Record<string, unknown>;
  const fieldConfidence = Object.fromEntries(['effectiveDate', 'term', 'parties', 'jurisdiction', 'renewal', 'survival'].map(k => [k, conf(c[k])]));
  // Missing values are not "confident": the sheet should ask about them.
  if (!effectiveDate) fieldConfidence.effectiveDate = 0;
  if (!term.months && !term.indefinite && !term.fixedEndDate) fieldConfidence.term = 0;
  const values = Object.values(fieldConfidence);
  const ndaKind: NdaKind | null = r.ndaKind === 'unilateral' || r.ndaKind === 'bilateral' ? r.ndaKind : null;
  const country = typeof r.jurisdictionCountry === 'string' ? countryCode(r.jurisdictionCountry) : null;

  return {
    contract: {
      userId: ctx.uid,
      documentId: ctx.documentId,
      caseId: ctx.caseId,
      clientId: ctx.clientId,
      type,
      title: clean(r.title, 160) || ctx.fallbackTitle,
      language: r.language === 'en' ? 'en' : 'es',
      jurisdiction: { country, region: null },
      governingLaw: clean(r.governingLaw, 120) || null,
      ndaKind: type === 'nda' ? ndaKind : null,
      parties,
      term,
      dates: computeDates(effectiveDate, term),
      clauses,
      extraction: {
        source: 'llm', model: ctx.model,
        confidence: values.length ? Math.min(...values) : 0,
        fieldConfidence, extractedAt: new Date().toISOString(),
      },
      confirmedByUser: false,
      confirmedAt: null,
      lifecycle: 'active',
      snoozedUntil: null,
      alertsMuted: false,
      renewsContractId: null,
      renewedByContractId: null,
    },
  };
}

/** Below this, a field is highlighted in the confirmation sheet. */
export const LOW_CONFIDENCE = 0.7;

/** Server-side validation of an edit from the confirmation sheet; returns an error message or null. */
export function validateContractEdit(e: unknown): string | null {
  if (!e || typeof e !== 'object') return 'Datos no válidos.';
  const x = e as Record<string, unknown>;
  if (x.title !== undefined && (typeof x.title !== 'string' || !x.title.trim() || x.title.length > 160)) return 'El título no es válido.';
  if (x.type !== undefined && !['nda', 'service', 'other'].includes(x.type as string)) return 'Tipo no válido.';
  if (x.effectiveDate !== undefined && x.effectiveDate !== null && !isIsoDate(x.effectiveDate)) return 'La fecha de inicio no es válida.';
  if (x.parties !== undefined) {
    if (!Array.isArray(x.parties) || x.parties.length > 6) return 'Partes no válidas.';
    if (x.parties.some(p => !p || typeof (p as ContractParty).name !== 'string' || !(p as ContractParty).name.trim())) return 'Cada parte necesita un nombre.';
  }
  if (x.term !== undefined) {
    const t = (x.term ?? {}) as ContractTerm;
    const okInt = (v: unknown, max: number) => v === undefined || v === null || (Number.isInteger(v) && (v as number) > 0 && (v as number) <= max);
    if (!okInt(t.months, 1200) || !okInt(t.renewalMonths, 1200) || !okInt(t.noticeDays, 3650) || !okInt(t.survivalMonths, 1200)) return 'Revisa los plazos (números enteros positivos).';
    if (t.fixedEndDate !== undefined && t.fixedEndDate !== null && !isIsoDate(t.fixedEndDate)) return 'La fecha de fin no es válida.';
  }
  return null;
}
