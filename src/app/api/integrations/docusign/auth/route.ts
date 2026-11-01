import { NextRequest, NextResponse } from 'next/server';
import { randomToken } from '@/lib/integrations/crypto';
import { encodeSignedState } from '@/lib/integrations/signed-state';
import { sanitizeReturnTo } from '@/lib/integrations/urls';
import { buildAuthorizeUrl } from '@/lib/docusign/oauth';
import { requireDocusignUser } from '@/lib/docusign/route-helpers';
import { savePendingNonce } from '@/lib/docusign/tokens';

// Per-request OAuth endpoint — never prerendered.
export const dynamic = 'force-dynamic';

// GET /api/integrations/docusign/auth?returnTo=/profile&switch=1
// Returns { url } — the DocuSign consent/login URL. State = signed { uid, nonce, returnTo }.
// `switch=1` forces the DocuSign login screen so the user can pick another DocuSign user.
export async function GET(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;

  const q = req.nextUrl.searchParams;
  const nonce = randomToken(16);
  await savePendingNonce(uid, nonce);
  const state = encodeSignedState({ uid, nonce, returnTo: sanitizeReturnTo(q.get('returnTo'), '/profile') });
  return NextResponse.json({ url: buildAuthorizeUrl(state, { forceLogin: q.get('switch') === '1' }) });
}
