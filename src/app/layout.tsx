import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { I18nProvider } from '@/contexts/I18nContext';

export const metadata: Metadata = {
  title: 'Avocat - Plataforma LegalTech',
  description: 'Plataforma moderna de tecnología legal impulsada por IA',
  keywords: ['legaltech', 'ia', 'derecho', 'servicios legales'],
  authors: [{ name: 'Andres Levano' }],
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-serif antialiased">
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-16479671897"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-16479671897');
          `}
        </Script>
        {/* Zapier Interfaces Chatbot */}
        <Script
          src="https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js"
          strategy="afterInteractive"
          type="module"
        />
        <I18nProvider>
          <div className="min-h-screen bg-app">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
