'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { CONSENT_EVENT, readConsent, type Consent } from '@/lib/consent';

const GOOGLE_ADS_ID = 'AW-16479671897';
const CLARITY_ID = 'vu7td8np1h';

type Gtag = (...args: unknown[]) => void;

// Loads Google Ads (gtag) and Microsoft Clarity only after consent. Google Consent Mode v2
// defaults (all denied) are set in the root layout before anything else runs.
export default function ConsentScripts() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (!consent || !gtag) return;
    const ad = consent.ads ? 'granted' : 'denied';
    gtag('consent', 'update', {
      ad_storage: ad,
      ad_user_data: ad,
      ad_personalization: ad,
      analytics_storage: consent.analytics ? 'granted' : 'denied',
    });
  }, [consent]);

  return (
    <>
      {consent?.ads && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">
            {`gtag('js', new Date()); gtag('config', '${GOOGLE_ADS_ID}');`}
          </Script>
        </>
      )}
      {consent?.analytics && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");`}
        </Script>
      )}
    </>
  );
}
