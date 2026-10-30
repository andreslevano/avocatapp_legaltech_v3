import { authorityHost, msServerConfig, sanitizeReturnTo } from '@/lib/integrations/microsoft/config';
import AdminConsentView from './AdminConsentView';

// Shown when the user's organisation blocks user consent (AADSTS65001 / 90094 …).
// The admin-consent URL grants the app's registered read-only permissions for the whole tenant.
export default function AdminConsentPage({ searchParams }: { searchParams: { tid?: string; returnTo?: string } }) {
  const cfg = msServerConfig();
  const tid = searchParams.tid && /^[0-9a-f-]{36}$/i.test(searchParams.tid) ? searchParams.tid : 'organizations';
  const url = new URL(`${authorityHost(cfg.authority)}/${tid}/v2.0/adminconsent`);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    scope: 'https://graph.microsoft.com/.default',
    redirect_uri: cfg.redirectUri,
    state: 'admin',
  }).toString();
  return <AdminConsentView adminConsentUrl={url.toString()} returnTo={sanitizeReturnTo(searchParams.returnTo)} />;
}
