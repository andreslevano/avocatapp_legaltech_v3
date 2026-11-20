import type { Metadata } from 'next';
import SignInvite from './SignInvite';

// Public page behind the link Avocat emails to a counterparty (Yousign path). No login.
export const metadata: Metadata = {
  title: 'Firma un documento · Avocat',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page({ params }: { params: { token: string } }) {
  return <SignInvite token={params.token} />;
}
