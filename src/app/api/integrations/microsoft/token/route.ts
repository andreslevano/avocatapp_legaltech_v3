import { NextRequest, NextResponse } from 'next/server';
import { isAllowedPickerResource } from '@/lib/integrations/microsoft/config';
import { getAccessToken, loadSecret } from '@/lib/integrations/microsoft/connection';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';

// POST /api/integrations/microsoft/token  { resource }
// Short-lived token for the File Picker only: the user's own SharePoint hosts or OneDrive
// consumer. Never the refresh token, never a Graph token.
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;

  const body = await req.json().catch(() => null) as { resource?: unknown } | null;
  const resource = typeof body?.resource === 'string' ? body.resource : '';

  try {
    const secret = await loadSecret(uid);
    if (!isAllowedPickerResource(resource, secret)) {
      return NextResponse.json({ error: 'Recurso no permitido', code: 'resource_not_allowed' }, { status: 400 });
    }
    const scope = secret.accountType === 'personal'
      ? 'OneDrive.ReadOnly'                          // consumer picker scope (Microsoft docs)
      : `${new URL(resource).origin}/.default`;      // SharePoint host, read-only perms from the registration
    const { token, expiresOn } = await getAccessToken(uid, scope);
    return NextResponse.json({ token, expiresOn });
  } catch (err) {
    return connectorErrorResponse(err);
  }
}
