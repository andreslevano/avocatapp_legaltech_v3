import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import { I18nProvider } from '@/contexts/I18nContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Avocat - Plataforma LegalTech',
  description: 'Plataforma moderna de tecnología legal impulsada por IA',
  keywords: ['legaltech', 'ia', 'derecho', 'servicios legales'],
  authors: [{ name: 'Andres Levano' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
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
        <I18nProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
