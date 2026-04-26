'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Rail from '@/components/layout/Rail';
import Sidebar from '@/components/layout/Sidebar';

interface AppShellClientProps {
  children: React.ReactNode;
}

export default function AppShellClient({ children }: AppShellClientProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) { router.push('/login'); return; }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { router.push('/login'); return; }

      if (!db) { setUser(fbUser); setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (!snap.exists()) { router.push('/onboarding'); return; }
        const data = snap.data() as UserDoc;
        if (!data.plan || !data.onboardingComplete) { router.push('/onboarding'); return; }
        setUser(fbUser);
        setUserDoc(data);
      } catch {
        router.push('/login'); return;
      }
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161410] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !userDoc) return null;

  return (
    <AppAuthProvider user={user} userDoc={userDoc}>
      <SidebarProvider>
        {/* Main shell grid */}
        <div className="flex h-screen overflow-hidden bg-[#161410]">
          {/* Rail: hidden on mobile (shows as fixed bottom nav instead) */}
          <Rail user={user} userDoc={userDoc} />

          {/* Sidebar: 220px on desktop, slide-in overlay on mobile */}
          <Sidebar userDoc={userDoc} />

          {/* Main content: full width on mobile, flex-1 on desktop */}
          <main className="flex-1 overflow-auto flex flex-col min-w-0 pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </AppAuthProvider>
  );
}
