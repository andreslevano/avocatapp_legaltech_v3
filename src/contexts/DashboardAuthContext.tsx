'use client';

import { createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';

interface DashboardAuthContextValue {
  user: User | null;
}

const DashboardAuthContext = createContext<DashboardAuthContextValue | null>(null);

export function DashboardAuthProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  return (
    <DashboardAuthContext.Provider value={{ user }}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth() {
  const ctx = useContext(DashboardAuthContext);
  return ctx?.user ?? null;
}
