import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { respondNegotiation } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations/{id}/respond { decisions, replies } — owner's turn only; starts round N+1.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    return NextResponse.json(await respondNegotiation(caller.uid, params.id, body));
  } catch (err) {
    return errorResponse(err);
  }
}
