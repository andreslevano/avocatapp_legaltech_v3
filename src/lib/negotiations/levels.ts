// NDA negotiation — clause levels and the per-template playbook of defaults. Pure, client-safe.
//   modificable     the other party may propose new wording freely
//   negociable      may propose new wording, explaining why (reason required)
//   no_modificable  may only accept or comment

import { MFW_NDA_TEMPLATE } from '@/lib/org-templates/mobiforwork-nda';

export type ClauseLevel = 'modificable' | 'negociable' | 'no_modificable';
export const CLAUSE_LEVELS: ClauseLevel[] = ['modificable', 'negociable', 'no_modificable'];

export const LEVEL_LABEL: Record<ClauseLevel, string> = {
  modificable: 'Modificable',
  negociable: 'Negociable',
  no_modificable: 'No modificable',
};

export const LEVEL_HELP: Record<ClauseLevel, string> = {
  modificable: 'Puedes proponer otra redacción.',
  negociable: 'Puedes proponer otra redacción explicando el motivo.',
  no_modificable: 'Solo puedes aceptarla o comentarla.',
};

export const isClauseLevel = (v: unknown): v is ClauseLevel => CLAUSE_LEVELS.includes(v as ClauseLevel);

/** What the other party may do on a clause of this level. */
export function levelAllows(level: ClauseLevel): { propose: boolean; reasonRequired: boolean } {
  return { propose: level !== 'no_modificable', reasonRequired: level === 'negociable' };
}

export interface Playbook {
  templateId: string;
  templateVersion: string;
  /** Owner's company as the other party sees it ("{Empresa} te ha enviado un borrador de NDA"). */
  company: string;
  clauseCount: number;
  defaults: Record<number, ClauseLevel>;
}

// pending legal approval by MOBIFORWORK
export const MFW_PLAYBOOK: Playbook = {
  templateId: MFW_NDA_TEMPLATE.id,
  templateVersion: MFW_NDA_TEMPLATE.version,
  company: MFW_NDA_TEMPLATE.company,
  clauseCount: 14,
  defaults: {
    1: 'negociable', 2: 'negociable', 3: 'negociable', 7: 'negociable', 9: 'negociable', 13: 'negociable',
    4: 'no_modificable', 6: 'no_modificable', 8: 'no_modificable', 10: 'no_modificable', 11: 'no_modificable',
    5: 'modificable', 12: 'modificable', 14: 'modificable',
  },
};

const PLAYBOOKS: Record<string, Playbook> = { [MFW_PLAYBOOK.templateId]: MFW_PLAYBOOK };

export const playbookFor = (templateId: string): Playbook | null => PLAYBOOKS[templateId] ?? null;

/** Default level of clause n (negociable when the playbook doesn't say). */
export const defaultLevel = (p: Playbook, n: number): ClauseLevel => p.defaults[n] ?? 'negociable';
