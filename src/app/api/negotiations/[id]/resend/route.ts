import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { resendNegotiation } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations/{id}/resend — new link (earlier ones stop working), new expiry, email again.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  try {
    return NextResponse.json(await resendNegotiation(caller.uid, params.id));
  } catch (err) {
    return errorResponse(err);
  }
}
