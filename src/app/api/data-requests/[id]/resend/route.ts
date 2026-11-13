import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller, resendDataRequest } from '@/lib/data-requests/server';

export const dynamic = 'force-dynamic';

// POST /api/data-requests/{id}/resend — new link (token rotated), new 14-day expiry, email again.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  try {
    return NextResponse.json(await resendDataRequest(caller.uid, params.id));
  } catch (err) {
    return errorResponse(err);
  }
}
