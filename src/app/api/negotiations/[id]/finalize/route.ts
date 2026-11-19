import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { finalizeNegotiation } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations/{id}/finalize — agreed only: returns the agreed markdown for the final Word/PDF.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  try {
    return NextResponse.json(await finalizeNegotiation(caller.uid, params.id));
  } catch (err) {
    return errorResponse(err);
  }
}
