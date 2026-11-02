// contracts/{id} — structured record of a contract (F0). Owner read-only (rules); the server writes.
// Dates are calendar dates "YYYY-MM-DD" (no time zone games: a contract ends on a day, not an instant).

export type ContractType = 'nda' | 'service' | 'other';
export type NdaKind = 'unilateral' | 'bilateral';
export type Lifecycle = 'active' | 'expiring' | 'expired' | 'renewed' | 'terminated' | 'superseded';
export type PartyRole = 'disclosing' | 'receiving' | 'mutual';
export type DateKind = 'noticeDeadline' | 'termEndDate' | 'confidentialitySurvivalEnd';

export const CLAUSE_KEYS = [
  'definition_confidential_info', 'exclusions', 'permitted_disclosure', 'whistleblower_carveout',
  'personal_data', 'return_destruction', 'non_solicit', 'non_compete', 'penalty', 'governing_law',
  'jurisdiction_forum', 'term', 'survival', 'ai_tools_use',
] as const;
export type ClauseKey = typeof CLAUSE_KEYS[number];

export interface ContractParty {
  name: string;
  company?: string | null;
  role: PartyRole;
  idType?: string | null;
  idNumber?: string | null;
  email?: string | null;
}

/** What the dates are computed from (dates.ts). */
export interface ContractTerm {
  durationText?: string | null;
  months?: number | null;            // agreement term; null with indefinite = no end
  indefinite?: boolean;
  fixedEndDate?: string | null;      // an explicit end date that overrides effective + months
  autoRenewal?: boolean;
  renewalMonths?: number | null;     // defaults to `months`
  noticeDays?: number | null;        // notice of non-renewal, before the term end
  survivalMonths?: number | null;    // confidentiality obligations surviving after the term
}

export interface ContractDates {
  effectiveDate: string | null;
  termEndDate: string | null;
  confidentialitySurvivalEnd: string | null;
  noticeDeadline: string | null;
}

export interface ContractClause { key: ClauseKey; present: boolean; excerpt?: string | null }

export interface ContractExtraction {
  source: 'generated' | 'llm';
  model?: string;
  confidence: number;                          // 0..1 overall
  fieldConfidence: Record<string, number>;     // effectiveDate, term, parties, jurisdiction, renewal, survival
  extractedAt: string;
}

export interface Contract {
  id: string;
  userId: string;
  documentId: string;
  caseId: string | null;
  clientId: string | null;
  type: ContractType;
  title: string;
  /** What the confidential information is about (NDA "objeto"); reused when renewing. */
  purpose?: string | null;
  language: 'es' | 'en';
  jurisdiction: { country: string | null; region?: string | null };
  governingLaw?: string | null;
  ndaKind?: NdaKind | null;
  parties: ContractParty[];
  term: ContractTerm;
  dates: ContractDates;
  clauses: ContractClause[];
  extraction: ContractExtraction;
  confirmedByUser: boolean;
  confirmedAt?: string | null;
  lifecycle: Lifecycle;
  /** F3 actions: no alerts until this day ("Posponer 7 días") / never again ("Dejar vencer"). */
  snoozedUntil?: string | null;
  alertsMuted?: boolean;
  renewedByContractId?: string | null;
  renewsContractId?: string | null;
  /** F2: approved legal changes that may affect it (server-written). */
  legal?: { flaggedByChangeIds?: string[]; flaggedAt?: string; verdict?: string; checkedAt?: string; lastCheckId?: string };
  createdAt: string;
  updatedAt: string;
}

/** The fields a user may set from the confirmation sheet (PATCH /api/contracts/[id]). */
export interface ContractEdit {
  title?: string;
  type?: ContractType;
  ndaKind?: NdaKind | null;
  jurisdictionCountry?: string | null;
  parties?: ContractParty[];
  effectiveDate?: string | null;
  term?: ContractTerm;
}

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  active: 'Vigente', expiring: 'Por vencer', expired: 'Vencido', renewed: 'Renovado',
  terminated: 'Terminado', superseded: 'Sustituido',
};

export const DATE_KIND_LABEL: Record<DateKind, string> = {
  termEndDate: 'Fin del acuerdo',
  noticeDeadline: 'Último día de preaviso',
  confidentialitySurvivalEnd: 'Fin de la confidencialidad',
};

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = { nda: 'NDA', service: 'Servicios', other: 'Otro' };

/** Lifecycle states that still produce alerts. */
export const OPEN_LIFECYCLES: Lifecycle[] = ['active', 'expiring'];

export const COUNTRIES: { code: string; label: string }[] = [
  { code: 'ES', label: 'España' }, { code: 'EU', label: 'Unión Europea' }, { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' }, { code: 'MX', label: 'México' }, { code: 'AR', label: 'Argentina' },
  { code: 'PE', label: 'Perú' }, { code: 'US', label: 'Estados Unidos' }, { code: 'GB', label: 'Reino Unido' },
];

/** "España", "Chile", "spain"… (free text from the NDA form) → ISO code, or null. */
export function countryCode(text: string | null | undefined): string | null {
  const t = (text ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!t) return null;
  if (/^[a-z]{2}$/.test(t)) return t.toUpperCase();
  const table: [RegExp, string][] = [
    [/espana|spain/, 'ES'], [/union europea|european union|^ue$|^eu$/, 'EU'], [/chile/, 'CL'], [/colombia/, 'CO'],
    [/mexico/, 'MX'], [/argentina/, 'AR'], [/peru/, 'PE'], [/estados unidos|united states|usa|ee\.? ?uu/, 'US'],
    [/reino unido|united kingdom|england|inglaterra/, 'GB'],
  ];
  return table.find(([re]) => re.test(t))?.[1] ?? null;
}
