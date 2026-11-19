import type { Metadata } from 'next';
import NegotiationReview from './NegotiationReview';

// Public page behind the link emailed for an NDA negotiation. No login; all data goes through
// /api/negotiations/public/{token}.
export const metadata: Metadata = {
  title: 'Revisa el borrador del NDA · Avocat',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page({ params }: { params: { token: string } }) {
  return <NegotiationReview token={params.token} />;
}
