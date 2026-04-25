'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';

interface AppAuthContextValue {
  user: User;
  userDoc: UserDoc;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({
  user,
  userDoc,
  children,
}: AppAuthContextValue & { children: ReactNode }) {
  return (
    <AppAuthContext.Provider value={{ user, userDoc }}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth(): AppAuthContextValue {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth must be used within AppAuthProvider');
  return ctx;
}
