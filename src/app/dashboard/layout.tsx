import AppShellClient from '@/components/layout/AppShellClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
