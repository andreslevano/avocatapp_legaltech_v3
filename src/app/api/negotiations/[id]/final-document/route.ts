import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { linkFinalDocument } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations/{id}/final-document { documentId } — links the saved final document.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    return NextResponse.json(await linkFinalDocument(caller.uid, params.id, body));
  } catch (err) {
    return errorResponse(err);
  }
}
