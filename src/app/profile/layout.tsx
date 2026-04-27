import AppShellClient from '@/components/layout/AppShellClient';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
