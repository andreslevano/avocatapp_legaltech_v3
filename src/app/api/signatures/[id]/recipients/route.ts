import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { correctCounterpartyEmail } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// PATCH /api/signatures/[id]/recipients  { email, name?, recipientId? } — corrects a signer's email and re-sends.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    const body = await req.json().catch(() => null) as { email?: unknown; name?: unknown; recipientId?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email : '';
    const name = typeof body?.name === 'string' ? body.name : undefined;
    const recipientId = Number.isInteger(body?.recipientId) ? body!.recipientId as number : undefined;
    return NextResponse.json(await correctCounterpartyEmail(uid, params.id, email, name, recipientId));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
