import { NextRequest, NextResponse } from 'next/server';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { ImportError, updateImportJob } from '@/lib/integrations/microsoft/import-server';

export const dynamic = 'force-dynamic';

// POST /api/integrations/microsoft/import/jobs/[id] { action: 'cancel' | 'retry_failed' | 'resume' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { action?: unknown } | null;
  if (!['cancel', 'retry_failed', 'resume'].includes(b?.action as string)) return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  try {
    await updateImportJob(uid, params.id, b!.action as 'cancel' | 'retry_failed' | 'resume');
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ImportError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    return connectorErrorResponse(err);
  }
}
