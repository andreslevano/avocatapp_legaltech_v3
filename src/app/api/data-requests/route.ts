import { NextRequest, NextResponse } from 'next/server';
import { createDataRequest, errorResponse, requireCaller } from '@/lib/data-requests/server';

export const dynamic = 'force-dynamic';

// POST /api/data-requests { clientId, documents } — "Solicitar datos al cliente": creates the request,
// emails the client a single-use link and returns it once (the token itself is never stored).
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    return NextResponse.json(await createDataRequest(caller, body));
  } catch (err) {
    return errorResponse(err);
  }
}
