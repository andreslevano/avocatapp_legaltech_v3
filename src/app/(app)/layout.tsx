import AppShellClient from '@/components/layout/AppShellClient';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
