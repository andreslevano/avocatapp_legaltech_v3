// legal_changes/{id} — legal-change monitoring (F2, step 1). Plan: docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md
// Detected from official feeds (BOE, EUR-Lex) or added by hand, triaged by AI, approved by an admin
// (L1: never auto-approved). Readable by admins; approved ones by any signed-in user (rules).

import type { ClauseKey } from '@/lib/contracts/types';

export type LegalSource = 'boe' | 'eurlex' | 'manual';
export type LegalJurisdiction = 'ES' | 'EU';
export type ChangeStatus = 'new' | 'approved' | 'dismissed';
export type ChangeSeverity = 'critical' | 'important' | 'recommended';

export const LEGAL_TOPICS = [
  'trade_secrets', 'personal_data', 'whistleblowing', 'employment', 'ai', 'data_act',
  'competition', 'cybersecurity', 'consumer', 'other',
] as const;
export type LegalTopic = typeof LEGAL_TOPICS[number];

export const TOPIC_LABEL: Record<LegalTopic, string> = {
  trade_secrets: 'Secretos empresariales', personal_data: 'Protección de datos', whistleblowing: 'Protección de informantes',
  employment: 'Laboral', ai: 'Inteligencia artificial', data_act: 'Datos (Data Act)', competition: 'Competencia',
  cybersecurity: 'Ciberseguridad', consumer: 'Consumo', other: 'Otro',
};

export const SEVERITY_LABEL: Record<ChangeSeverity, string> = { critical: 'Crítico', important: 'Importante', recommended: 'Recomendado' };

export interface LegalChange {
  id: string;
  source: LegalSource;
  externalId: string;            // BOE-A-2026-12345 · CELEX 32026R1234 · manual-…
  url: string;
  title: string;
  publishedAt: string;           // YYYY-MM-DD
  effectiveFrom: string | null;  // YYYY-MM-DD (entry into force), when known
  jurisdiction: LegalJurisdiction;
  contractTypes: ('nda' | 'service' | 'other')[];
  topics: LegalTopic[];
  clauseKeys: ClauseKey[];
  summary: string;               // what changed, plain Spanish
  requirement: string;           // what an NDA must / must not contain now
  severity: ChangeSeverity;
  suggestedClause: string | null;
  aiTriage: { relevant: boolean; rationale: string; confidence: number; model: string };
  status: ChangeStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  dismissedAt?: string | null;
  flaggedContracts?: number;     // set on approval
  createdAt: string;
  updatedAt: string;
}

/** Fields an admin can edit before approving. */
export interface ChangeEdit {
  title?: string;
  summary?: string;
  requirement?: string;
  severity?: ChangeSeverity;
  suggestedClause?: string | null;
  topics?: LegalTopic[];
  effectiveFrom?: string | null;
  jurisdiction?: LegalJurisdiction;
}

/** EU law applies to these contract jurisdictions (F0 country codes). */
export const EU_MEMBER_CODES = new Set([
  'EU', 'ES', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'SE',
]);

/** Does a change in `jurisdiction` concern a contract governed by `country`? */
export function changeAppliesTo(jurisdiction: LegalJurisdiction, country: string | null | undefined): boolean {
  if (!country) return false;
  return jurisdiction === 'ES' ? country === 'ES' : EU_MEMBER_CODES.has(country);
}
