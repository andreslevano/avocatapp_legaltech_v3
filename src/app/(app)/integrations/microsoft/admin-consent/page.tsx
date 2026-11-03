import { adminConsentUrl, msServerConfig, sanitizeReturnTo } from '@/lib/integrations/microsoft/config';
import AdminConsentView from './AdminConsentView';

// Shown when the user's organisation blocks user consent (AADSTS65001 / 90094 …) or the user left
// Microsoft's admin-approval screen (access_denied / AADSTS65004 → reason=declined).
// The admin-consent URL grants the app's registered read-only permissions for the whole tenant.
export default function AdminConsentPage({ searchParams }: { searchParams: { tid?: string; returnTo?: string; reason?: string } }) {
  const tid = searchParams.tid && /^[0-9a-f-]{36}$/i.test(searchParams.tid) ? searchParams.tid : null;
  return (
    <AdminConsentView
      adminConsentUrl={adminConsentUrl(msServerConfig(), tid)}
      tid={tid}
      returnTo={sanitizeReturnTo(searchParams.returnTo)}
      declined={searchParams.reason === 'declined'}
    />
  );
}
