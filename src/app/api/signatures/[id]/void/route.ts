import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { voidSignatureRequest } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/[id]/void — cancels the envelope; the document is unlocked (D11).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    return NextResponse.json(await voidSignatureRequest(uid, params.id));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
