import { NextRequest, NextResponse } from 'next/server';
import { randomToken } from '@/lib/integrations/crypto';
import { sanitizeReturnTo } from '@/lib/integrations/microsoft/config';
import { savePending } from '@/lib/integrations/microsoft/connection';
import { buildAuthorizeUrl } from '@/lib/integrations/microsoft/oauth';
import { requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { encodeState } from '@/lib/integrations/microsoft/state';

// GET /api/integrations/microsoft/auth?returnTo=/documents&intent=import&folderId=…&caseId=…
// Returns { url } — the Microsoft sign-in URL. State is signed and bound to a server-side nonce.
export async function GET(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;

  const q = req.nextUrl.searchParams;
  const nonce = randomToken(16);
  const codeVerifier = randomToken(48);
  await savePending(uid, nonce, codeVerifier);

  const state = encodeState({
    uid,
    nonce,
    returnTo: sanitizeReturnTo(q.get('returnTo')),
    intent: q.get('intent') === 'import' ? 'import' : 'connect',
    folderId: q.get('folderId') || null,
    caseId: q.get('caseId') || null,
  });

  return NextResponse.json({ url: buildAuthorizeUrl({ state, codeVerifier }) });
}
