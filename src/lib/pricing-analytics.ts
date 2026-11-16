'use client';

// Pricing analytics (Google tag), only with analytics consent (src/lib/consent.ts).
import { trackEvent } from './gtag';
import { readConsent } from './consent';

export type PricingEvent =
  | 'pricing_country_change' | 'pricing_billing_toggle' | 'pricing_profile_select' | 'pricing_estimator_use'
  | 'pricing_cta_click' | 'pricing_signature_section_view' | 'waitlist_submit';

export function trackPricing(event: PricingEvent, params: Record<string, string | number | boolean> = {}) {
  try {
    if (readConsent()?.analytics) trackEvent(event, params);
  } catch { /* analytics never breaks the page */ }
}
