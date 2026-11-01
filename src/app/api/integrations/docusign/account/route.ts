import { NextRequest, NextResponse } from 'next/server';
import { chooseAccount } from '@/lib/docusign/config';
import { getUserInfo } from '@/lib/docusign/oauth';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { getValidAccessToken, switchAccount } from '@/lib/docusign/tokens';

// Per-request OAuth endpoint — never prerendered.
export const dynamic = 'force-dynamic';

// POST /api/integrations/docusign/account  { accountId }
// Switches between the DocuSign accounts the connected user belongs to. The base URI is
// re-read from userinfo (D3), never taken from the client.
export async function POST(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  const body = await req.json().catch(() => null) as { accountId?: unknown } | null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : '';

  try {
    const { accessToken } = await getValidAccessToken(uid);
    const info = await getUserInfo(accessToken);
    const account = chooseAccount(info.accounts, accountId);
    if (!account || account.accountId !== accountId) {
      return NextResponse.json({ error: 'Cuenta no encontrada', code: 'account_not_found' }, { status: 404 });
    }
    await switchAccount(uid, account);
    return NextResponse.json({ ok: true, accountId: account.accountId, accountName: account.accountName });
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
