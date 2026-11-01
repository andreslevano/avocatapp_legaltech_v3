import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { recordOwnerReturn } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/[id]/return  { event } — the owner is back from embedded signing.
// Updates the request from the returnUrl event without asking DocuSign for status (D13b).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  const body = await req.json().catch(() => null) as { event?: unknown } | null;
  const event = typeof body?.event === 'string' ? body.event.slice(0, 40) : '';
  try {
    return NextResponse.json(await recordOwnerReturn(uid, params.id, event));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
