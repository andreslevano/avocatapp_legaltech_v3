// Cookie consent (AEPD guidance): stored in a first-party cookie, everything off by default.
export interface Consent { analytics: boolean; ads: boolean; v: 1; ts: number }

export const CONSENT_COOKIE = 'avocat_consent';
export const CONSENT_EVENT = 'avocat:consent';            // fired after the user chooses
export const OPEN_SETTINGS_EVENT = 'avocat:cookie-settings'; // footer "Configurar cookies"
const MAX_AGE = 60 * 60 * 24 * 180; // 6 months, then ask again

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.split('; ').find(c => c.startsWith(`${CONSENT_COOKIE}=`))?.split('=')[1];
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw));
    return c && c.v === 1 ? { analytics: !!c.analytics, ads: !!c.ads, v: 1, ts: Number(c.ts) || 0 } : null;
  } catch { return null; }
}

export function saveConsent(choice: { analytics: boolean; ads: boolean }): Consent {
  const c: Consent = { ...choice, v: 1, ts: Date.now() };
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  return c;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
