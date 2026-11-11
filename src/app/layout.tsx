import type { Metadata } from 'next';
import Script from 'next/script';
import { Cormorant_Garamond, DM_Sans, EB_Garamond } from 'next/font/google';
import '@/styles/globals.css';
import { I18nProvider } from '@/contexts/I18nContext';
import ConsentScripts from '@/components/legal/ConsentScripts';
import CookieBanner from '@/components/legal/CookieBanner';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-document',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Avocat - Plataforma LegalTech',
  description: 'Plataforma moderna de tecnología legal impulsada por IA',
  keywords: ['legaltech', 'ia', 'derecho', 'servicios legales'],
  authors: [{ name: 'Andres Levano' }],
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light" className={`${cormorant.variable} ${dmSans.variable} ${ebGaramond.variable}`}>
      <body className="font-sans antialiased">
        {/* Google Consent Mode v2 — everything denied until the user chooses (CookieBanner). */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
              analytics_storage: 'denied', wait_for_update: 500
            });
          `}
        </Script>
        {/* Google Ads + Microsoft Clarity load only after consent */}
        <ConsentScripts />
        {/* NOTE: Zapier Chatbot script is loaded in (public)/layout.tsx only */}
        <I18nProvider>
          <div className="min-h-screen bg-avocat-cream">
            {children}
          </div>
          <CookieBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
