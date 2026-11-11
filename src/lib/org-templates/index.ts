// Organisation-specific document templates (validated by the organisation's lawyer).
// Pure, client-safe. A user gets an organisation's template when their email is at its domain and
// verified (sign-up doesn't prove ownership — same rule as src/lib/preview.ts), or when named here.

import { PREVIEW_NAMED_EMAILS, type Identity } from '@/lib/preview';
import { MFW_NDA_TEMPLATE } from './mobiforwork-nda';

export type OrgNdaTemplate = 'mobilityforwork';

const NAMED: Record<OrgNdaTemplate, string[]> = {
  mobilityforwork: PREVIEW_NAMED_EMAILS.filter(e => e.endsWith('@mobilityforwork.es')),
};

export function orgNdaTemplateFor(who: Identity): OrgNdaTemplate | null {
  const email = (typeof who === 'string' ? who : who?.email)?.trim().toLowerCase();
  if (!email) return null;
  const verified = typeof who === 'object' && who !== null && who.emailVerified === true;
  if (email.split('@')[1] === MFW_NDA_TEMPLATE.domain && (verified || NAMED.mobilityforwork.includes(email))) return 'mobilityforwork';
  return null;
}
