/**
 * Google Ads (gtag.js) tracking utilities
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Track a Google Ads event
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track a Google Ads conversion
 */
export const trackConversion = (conversionId: string, conversionLabel?: string, value?: number, currency?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const params: Record<string, any> = {
      send_to: conversionLabel ? `${conversionId}/${conversionLabel}` : conversionId,
    };
    
    if (value !== undefined) {
      params.value = value;
    }
    
    if (currency) {
      params.currency = currency;
    }
    
    window.gtag('event', 'conversion', params);
  }
};

/**
 * Track session start
 */
export const trackSessionStart = () => {
  trackEvent('session_start');
};

/**
 * Track signup start
 */
export const trackSignupStart = () => {
  trackEvent('start_signup');
};

/**
 * Track registration conversion
 */
export const trackRegistrationConversion = () => {
  trackEvent('ads_conversion_Registro_1');
};

/**
 * Track subscription success
 */
export const trackSubscriptionSuccess = () => {
  trackEvent('subscribe_success');
  // Track the specific subscription conversion
  trackConversion('AW-16479671897', '8Q-oCPbm0bgbENmsj719');
};

