// Maps Microsoft identity platform errors to the F1 outcome screens.
// Documented in docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md (F1 → "Microsoft error mapping").

export type ConnectOutcome = 'admin_consent' | 'consent_declined' | 'cancelled' | 'error';

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
  // Consent declined (AADSTS65004), or a bare access_denied: that is what Microsoft returns when the
  // user leaves the "Se necesita la aprobación del administrador" screen ("Volver a la aplicación sin
  // dar el consentimiento" — seen in production with no description, 2026-11-03). Both go to the
  // admin-approval page, whose copy also covers a user who simply cancelled (→ «Reintentar»).
  if (desc.includes('AADSTS65004')) return 'consent_declined';
  if (error === 'access_denied' && (!desc || /cancel|declined/i.test(desc))) return 'consent_declined';
  // Backed out of sign-in with a non-consent error code.
  if (subcode === 'cancel') return 'cancelled';
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
