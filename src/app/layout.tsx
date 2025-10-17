import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
        <I18nProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
