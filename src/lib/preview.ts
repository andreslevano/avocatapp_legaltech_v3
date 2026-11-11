// Preview access for features not yet open to every user of their plan (DocuSign, Microsoft,
// contracts / alerts / legal changes). Pure, client-safe; the server applies the same rule.
//   • explicit emails — named testers;
//   • PREVIEW_DOMAINS — everyone at those organisations, now and in the future, but ONLY with a
//     verified email: email/password sign-up doesn't prove ownership, so anyone could otherwise
//     register x@mobilityforwork.es.

export const PREVIEW_DOMAINS: string[] = ['mobilityforwork.es'];

/** Named testers: get every preview feature (and their organisation's templates) without verifying. */
export const PREVIEW_NAMED_EMAILS: string[] = [
  'andres.levano@mobilityforwork.es',
  'felix.dia@mobilityforwork.es',
];

/** A signed-in user (Firebase `User`, an ID-token-derived object) or just an email. */
export type Identity = string | null | undefined | { email?: string | null; emailVerified?: boolean | null };

export function inPreview(who: Identity, emails: string[], domains: string[] = PREVIEW_DOMAINS): boolean {
  const email = (typeof who === 'string' ? who : who?.email)?.trim().toLowerCase();
  if (!email) return false;
  if (emails.includes(email)) return true;
  const verified = typeof who === 'object' && who !== null && who.emailVerified === true;
  return verified && domains.includes(email.split('@')[1] ?? '');
}
