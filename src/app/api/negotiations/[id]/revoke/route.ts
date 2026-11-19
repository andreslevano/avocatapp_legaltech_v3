import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { revokeNegotiation } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations/{id}/revoke — the link stops working; the draft can't be signed.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  try {
    return NextResponse.json(await revokeNegotiation(caller.uid, params.id));
  } catch (err) {
    return errorResponse(err);
  }
}
