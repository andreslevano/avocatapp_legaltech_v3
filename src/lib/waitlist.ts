// "Avísame cuando esté disponible" (D6): input validation for POST /api/waitlist. Pure, unit tested.
import { isValidEmail } from '@/lib/data-requests/core';
import { isCountryCode, LADDER, type CountryCode, type PricingPlanId } from '@/lib/pricing';

export interface WaitlistEntry { email: string; country: CountryCode; plan: PricingPlanId | null }

export function parseWaitlist(body: unknown): { ok: true; entry: WaitlistEntry } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return { ok: false, error: 'Revisa el email.' };
  if (!isCountryCode(b.country)) return { ok: false, error: 'País no válido.' };
  const plan = b.plan === null || b.plan === undefined || b.plan === '' ? null
    : (LADDER as string[]).includes(String(b.plan)) ? b.plan as PricingPlanId : undefined;
  if (plan === undefined) return { ok: false, error: 'Plan no válido.' };
  return { ok: true, entry: { email, country: String(b.country).toUpperCase() as CountryCode, plan } };
}
