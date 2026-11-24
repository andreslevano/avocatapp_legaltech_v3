'use client';
// e2e harness: the user menu opened from an avatar at the bottom-left (desktop rail) or the mobile bottom bar.
import { useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import UserProfilePanel from '@/components/layout/UserProfilePanel';
const user = { uid: 'e2e-user', email: 'andres.levano@mobilityforwork.es', displayName: 'Andres Levano', getIdToken: async () => 'e2e' } as unknown as User;
const userDoc = { uid: 'e2e-user', plan: 'Abogados', displayName: 'Andres Levano', country: 'ES' } as unknown as UserDoc;
export default function Page() {
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <AppAuthProvider user={user} userDoc={userDoc}>
      <div className="h-screen bg-bg" data-theme="dark">
        <button ref={ref} aria-label="Perfil" onClick={() => setRect(ref.current!.getBoundingClientRect())}
          className="fixed bottom-4 left-4 w-10 h-10 rounded-full border border-accent-border text-accent-text">A</button>
        <UserProfilePanel open={!!rect} onClose={() => setRect(null)} anchorRect={rect} />
      </div>
    </AppAuthProvider>
  );
}
