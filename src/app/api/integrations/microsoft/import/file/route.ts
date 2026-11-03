import { NextRequest, NextResponse } from 'next/server';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { ImportError, importFile } from '@/lib/integrations/microsoft/import-server';
import { validIds } from '@/lib/integrations/microsoft/import';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const optId = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : null);

// POST /api/integrations/microsoft/import/file { driveId, itemId, folderId?, caseId?, clientId? } —
// copies ONE file into Avocat (read-only towards Microsoft). The browser loops over the selection.
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!validIds(b?.driveId, b?.itemId)) return NextResponse.json({ error: 'Elemento no válido.' }, { status: 400 });
  try {
    const doc = await importFile(uid, {
      driveId: b!.driveId as string, itemId: b!.itemId as string,
      folderId: optId(b!.folderId), caseId: optId(b!.caseId), clientId: optId(b!.clientId),
    });
    return NextResponse.json({ document: doc });
  } catch (err) {
    if (err instanceof ImportError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    return connectorErrorResponse(err);
  }
}
