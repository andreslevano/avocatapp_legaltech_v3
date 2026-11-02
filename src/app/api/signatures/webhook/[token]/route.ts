import { NextRequest, NextResponse } from 'next/server';
import { sha256Base64Url } from '@/lib/integrations/crypto';
import { handleConnectWebhook } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/webhook/[token] — DocuSign Connect (envelope-level eventNotification, D8).
// The opaque token in the URL authenticates the call (sha256 stored on the request). Firestore is
// updated from the payload only — no envelope re-fetch (D13b). Unknown tokens → 404, no details.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token ?? '';
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return new NextResponse(null, { status: 404 });
  const body = await req.json().catch(() => null);
  try {
    const known = await handleConnectWebhook(sha256Base64Url(token), body);
    if (!known) return new NextResponse(null, { status: 404 });
  } catch (err) {
    // 500 → DocuSign retries the delivery later (requireAcknowledgment).
    console.error('[signatures/webhook]', (err as Error)?.message);
    return new NextResponse(null, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
