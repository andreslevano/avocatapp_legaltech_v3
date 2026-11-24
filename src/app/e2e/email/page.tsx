'use client';
import { Suspense } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import RevisionEmail from '@/app/(app)/tools/revision-email/page';
const user = { uid: 'e2e-user', email: 'andres.levano@mobilityforwork.es', getIdToken: async () => 'e2e-token' } as unknown as User;
const userDoc = { uid: '', plan: 'Abogados', displayName: 'Andrés' } as unknown as UserDoc;
export default function Page() {
  if (process.env.NODE_ENV === 'production') return null;
  return <AppAuthProvider user={user} userDoc={userDoc}><div className="h-screen bg-bg" data-theme="dark"><Suspense><RevisionEmail /></Suspense></div></AppAuthProvider>;
}
