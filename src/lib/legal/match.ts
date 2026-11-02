// Which contracts an approved legal change may affect (F2). Pure — unit tested.

import { OPEN_LIFECYCLES, type Contract } from '@/lib/contracts/types';
import { changeAppliesTo, type LegalChange } from './types';

/** Contracts a change may affect: same jurisdiction (ES contracts also get EU law), contract type, open, started before it. */
export function isAffected(c: Pick<Contract, 'type' | 'jurisdiction' | 'dates' | 'confirmedByUser' | 'lifecycle'>, ch: Pick<LegalChange, 'jurisdiction' | 'contractTypes' | 'effectiveFrom' | 'publishedAt'>): boolean {
  if (!c.confirmedByUser || !OPEN_LIFECYCLES.includes(c.lifecycle)) return false;
  if (!(ch.contractTypes?.length ? ch.contractTypes : ['nda']).includes(c.type)) return false;
  if (!changeAppliesTo(ch.jurisdiction, c.jurisdiction?.country)) return false;
  const changeDate = ch.effectiveFrom ?? ch.publishedAt;
  return !c.dates?.effectiveDate || !changeDate || c.dates.effectiveDate <= changeDate;
}
