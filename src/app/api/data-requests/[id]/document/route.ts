import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, linkRequestDocument, requireCaller } from '@/lib/data-requests/server';

export const dynamic = 'force-dynamic';

// POST /api/data-requests/{id}/document { docId, documentId } — a tool saved the document prepared
// from this request's data (documentIds[docId] = documentId).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    return NextResponse.json(await linkRequestDocument(caller.uid, params.id, body));
  } catch (err) {
    return errorResponse(err);
  }
}
