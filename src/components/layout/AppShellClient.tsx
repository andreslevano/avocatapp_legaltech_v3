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
import { DocumentsWorkspaceProvider } from '@/contexts/DocumentsWorkspaceContext';
import Rail from '@/components/layout/Rail';
import Sidebar from '@/components/layout/Sidebar';
import SignatureNotifier from '@/components/signatures/SignatureNotifier';
import FocusedSigningHost from '@/components/signatures/FocusedSigningHost';
import { ImportJobsProvider } from '@/contexts/ImportJobsContext';
import PreviewVerifyBanner from '@/components/layout/PreviewVerifyBanner';

const LAWYER_ONLY_PATHS = ['/dashboard', '/cases'];

function isLawyerOnlyPath(pathname: string) {
  // Autoservicio tools live under /dashboard/autoservicio — open to all plans
  if (pathname.startsWith('/dashboard/autoservicio')) return false;
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

  // Preview by domain needs email_verified in the ID token (src/lib/preview.ts). Firebase only
  // refreshes tokens hourly, so right after verifying the server would still say "No disponible en
  // tu plan": force one refresh when the account is verified but the token isn't.
  useEffect(() => {
    if (!user?.emailVerified) return;
    user.getIdTokenResult()
      .then(r => { if (r.claims.email_verified !== true) return user.getIdToken(true); })
      .catch(() => {});
  }, [user]);

  // Portaled modals render into <body>, outside the shell div, so <body> carries the dark theme
  // too while the shell is up (`app-surface` stays as a hook for app-only CSS).
  useEffect(() => {
    document.body.classList.add('app-surface');
    document.body.dataset.theme = 'dark';
    return () => {
      document.body.classList.remove('app-surface');
      delete document.body.dataset.theme;
    };
  }, []);

  if (loading) {
    return (
      <div data-theme="dark" className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !userDoc) return null;

  return (
    <AppAuthProvider user={user} userDoc={userDoc}>
      <SidebarProvider>
        <DocumentsWorkspaceProvider>
          <ImportJobsProvider>
          <div data-theme="dark" className="flex h-[100dvh] overflow-hidden bg-bg">
            <Rail user={user} userDoc={userDoc} />
            <Sidebar userDoc={userDoc} />
            <main className="flex-1 overflow-auto flex flex-col min-w-0 pb-16 md:pb-0">
              <PreviewVerifyBanner />
              {children}
            </main>
          </div>
          <SignatureNotifier />
          <FocusedSigningHost />
          </ImportJobsProvider>
        </DocumentsWorkspaceProvider>
      </SidebarProvider>
    </AppAuthProvider>
  );
}
