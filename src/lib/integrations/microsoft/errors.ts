// Maps Microsoft identity platform errors to the F1 outcome screens.
// Documented in docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md (F1 → "Microsoft error mapping").

export type ConnectOutcome = 'admin_consent' | 'cancelled' | 'error';

const ADMIN_CONSENT_CODES = ['AADSTS65001', 'AADSTS90094', 'AADSTS90008', 'AADSTS900941'];

/** Classifies the error returned on the OAuth redirect (error, error_description, error_subcode). */
export function classifyAuthError(
  error: string | null, description: string | null, subcode: string | null,
): ConnectOutcome {
  const desc = description ?? '';
  if (error === 'consent_required' || error === 'admin_consent_required'
      || ADMIN_CONSENT_CODES.some(c => desc.includes(c))
      || /admin(istrator)? (approval|consent)|needs? (admin|permission to access resources in your organization)/i.test(desc)) {
    return 'admin_consent';
  }
  // AADSTS65004: user declined consent. subcode=cancel: user closed/backed out of sign-in.
  if (subcode === 'cancel' || desc.includes('AADSTS65004') || (error === 'access_denied' && !desc)) return 'cancelled';
  if (error === 'access_denied' && /cancel|declined/i.test(desc)) return 'cancelled';
  return 'error';
}

// Refresh-token failures that mean the user must reconnect (expired, revoked, password change,
// MFA/CA now required, consent withdrawn).
const REAUTH_CODES = ['AADSTS70008', 'AADSTS700082', 'AADSTS50173', 'AADSTS50076', 'AADSTS50079', 'AADSTS65001', 'AADSTS50078', 'AADSTS700084'];

export function isReauthError(body: { error?: string; error_description?: string } | null | undefined): boolean {
  if (!body) return false;
  if (body.error === 'invalid_grant' || body.error === 'interaction_required' || body.error === 'consent_required') return true;
  return REAUTH_CODES.some(c => (body.error_description ?? '').includes(c));
}

export class ReconnectRequiredError extends Error {
  constructor(message = 'Reconecta tu cuenta de Microsoft') { super(message); this.name = 'ReconnectRequiredError'; }
}

export class NotConnectedError extends Error {
  constructor() { super('Microsoft no conectado'); this.name = 'NotConnectedError'; }
}
