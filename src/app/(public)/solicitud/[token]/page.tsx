import type { Metadata } from 'next';
import DataRequestForm from './DataRequestForm';

// Public page behind the single-use link emailed by "Solicitar datos al cliente". No login; all data
// goes through /api/data-requests/public/{token}.
export const metadata: Metadata = {
  title: 'Completa tus datos · Avocat',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page({ params }: { params: { token: string } }) {
  return <DataRequestForm token={params.token} />;
}
