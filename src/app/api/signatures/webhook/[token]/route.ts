import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sha256Base64Url } from '@/lib/integrations/crypto';

export const dynamic = 'force-dynamic';

// POST /api/signatures/webhook/[token] — DocuSign Connect (envelope-level eventNotification, D8).
// Phase 2 stub: acknowledges known tokens so DocuSign doesn't retry. Phase 3 applies the payload
// (status + recipients) to signature_requests without re-fetching the envelope (D13b).
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token ?? '';
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return new NextResponse(null, { status: 404 });
  const hit = await db().collection('signature_requests')
    .where('webhookTokenHash', '==', sha256Base64Url(token)).limit(1).get();
  if (hit.empty) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ ok: true });
}
