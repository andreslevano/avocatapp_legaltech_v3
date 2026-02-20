/**
 * Utility to get the correct API endpoint URL based on environment
 * In production (static export), we use Firebase Cloud Functions
 * In development, we use Next.js API routes
 */

export function getCheckoutSessionEndpoint(): string {
  // In production (static export), API routes don't work, so use Cloud Function
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on the production domain
    const hostname = window.location.hostname;
    const isProduction = 
      hostname.includes('avocat-legaltech-v3.web.app') || 
      hostname.includes('avocatapp.com') ||
      hostname.includes('firebaseapp.com') ||
      (process.env.NODE_ENV === 'production' && !hostname.includes('localhost'));
    
    if (isProduction) {
      // Use Cloud Function URL in production
      return 'https://createcheckoutsession-xph64x4ova-uc.a.run.app';
    }
  }
  
  // In development or when API routes are available, use local API route
  return '/api/stripe/create-checkout-session';
}

/**
 * Get the extraction endpoint URL.
 * In production, use Cloud Function directly to avoid Hosting rewrite issues (502).
 * In development, use Next.js API route.
 */
export function getExtraccionDatosExtractEndpoint(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction =
      hostname.includes('avocat-legaltech-v3.web.app') ||
      hostname.includes('avocatapp.com') ||
      hostname.includes('www.avocatapp.com') ||
      hostname.includes('firebaseapp.com') ||
      (process.env.NODE_ENV === 'production' && !hostname.includes('localhost'));

    if (isProduction) {
      return 'https://extracciondatosextract-xph64x4ova-uc.a.run.app';
    }
  }
  return '/api/extraccion-datos/extract';
}
