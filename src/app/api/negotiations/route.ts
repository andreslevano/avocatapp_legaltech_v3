import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireCaller } from '@/lib/data-requests/server';
import { createNegotiation } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

// POST /api/negotiations { draftDocumentId, markdown, levels, counterparty, clientId?, showLevels }
// "Enviar a revisión": creates the negotiation (round 1) and emails the other party a link.
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    return NextResponse.json(await createNegotiation(caller, body));
  } catch (err) {
    return errorResponse(err);
  }
}
