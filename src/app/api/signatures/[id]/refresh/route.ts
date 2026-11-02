import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { refreshSignatureRequest } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/[id]/refresh — manual "Actualizar estado", throttled to 1 DocuSign call / 15 min (D9).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    return NextResponse.json(await refreshSignatureRequest(uid, params.id));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
