import { NextRequest, NextResponse } from 'next/server';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { ImportError, runNextJobItem } from '@/lib/integrations/microsoft/import-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/integrations/microsoft/import/jobs/[id]/next — imports the next file of the job (one per
// request, read-only towards Microsoft). Returns the job status, counts and the imported document.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    return NextResponse.json(await runNextJobItem(uid, params.id));
  } catch (err) {
    if (err instanceof ImportError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    return connectorErrorResponse(err);
  }
}
