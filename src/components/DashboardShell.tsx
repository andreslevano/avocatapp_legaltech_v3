'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';
import { DashboardAuthProvider } from '@/contexts/DashboardAuthContext';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // false = expanded, always show full menu
  const router = useRouter();

  useEffect(() => {
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isFirebaseReady && !user) {
      router.replace('/login');
    }
  }, [loading, isFirebaseReady, user, router]);

  if (loading || !isFirebaseReady) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardAuthProvider user={user}>
      <div className="h-screen bg-app flex overflow-hidden">
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col lg:pl-0 min-w-0 min-h-0 overflow-hidden">
          {/* Top bar */}
          <header className="shrink-0 z-40 bg-sidebar shadow-sm border-b border-border/50">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              {/* Mobile only: toggle overlay. Desktop uses sidebar's collapse button. */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-text-on-dark hover:bg-hover/20"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-1" />
              <UserMenu user={user} currentPlan="Avocat" />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </DashboardAuthProvider>
  );
}
