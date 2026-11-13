import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller, revokeDataRequest } from '@/lib/data-requests/server';

export const dynamic = 'force-dynamic';

// POST /api/data-requests/{id}/revoke — "Anular": the link stops working.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  try {
    return NextResponse.json(await revokeDataRequest(caller.uid, params.id));
  } catch (err) {
    return errorResponse(err);
  }
}
