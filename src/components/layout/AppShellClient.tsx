'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Rail from '@/components/layout/Rail';
import Sidebar from '@/components/layout/Sidebar';

const LAWYER_ONLY_PATHS = ['/dashboard', '/clients'];

function isLawyerOnlyPath(pathname: string) {
  return LAWYER_ONLY_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );
}

interface AppShellClientProps {
  children: React.ReactNode;
}

export default function AppShellClient({ children }: AppShellClientProps) {
  const [user,    setUser]    = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();
  // Keep a ref so the onSnapshot callback always sees the current pathname
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!auth) { router.push('/login'); return; }

    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) { router.push('/login'); return; }
      if (!db)     { setUser(fbUser); setLoading(false); return; }

      if (unsubDoc) unsubDoc();
      unsubDoc = onSnapshot(doc(db, 'users', fbUser.uid), (snap) => {
        if (!snap.exists()) { router.push('/onboarding'); return; }
        const data = snap.data() as UserDoc;
        if (!data.plan || !data.onboardingComplete) { router.push('/onboarding'); return; }

        // Guard: redirect non-Abogados away from lawyer-only routes.
        // Keep showing spinner (don't call setLoading(false)) until redirect
        // completes so dashboard content never renders for wrong plan.
        if (isLawyerOnlyPath(pathnameRef.current ?? '') && data.plan !== 'Abogados') {
          router.replace('/agent');
          return;
        }

        setUser(fbUser);
        setUserDoc(data);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
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
        <div className="flex h-screen overflow-hidden bg-[#161410]">
          <Rail user={user} userDoc={userDoc} />
          <Sidebar userDoc={userDoc} />
          <main className="flex-1 overflow-auto flex flex-col min-w-0 pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </AppAuthProvider>
  );
}
