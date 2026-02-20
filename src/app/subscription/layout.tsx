import DashboardShell from '@/components/DashboardShell';

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
