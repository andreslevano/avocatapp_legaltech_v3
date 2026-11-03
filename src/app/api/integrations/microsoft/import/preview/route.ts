import { NextRequest, NextResponse } from 'next/server';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { previewImport } from '@/lib/integrations/microsoft/import-server';
import { MAX_IMPORT_ITEMS, validIds } from '@/lib/integrations/microsoft/import';

export const dynamic = 'force-dynamic';

// POST /api/integrations/microsoft/import/preview { items: [{ driveId, itemId }] } — import options
// sheet (F1): name, size, source, whether it can be imported and earlier copies in Avocat.
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { items?: { driveId?: unknown; itemId?: unknown }[] } | null;
  const items = (Array.isArray(b?.items) ? b!.items : []).filter(i => validIds(i?.driveId, i?.itemId)) as { driveId: string; itemId: string }[];
  if (!items.length) return NextResponse.json({ error: 'No hay elementos seleccionados.' }, { status: 400 });
  if (items.length > MAX_IMPORT_ITEMS) return NextResponse.json({ error: `Elige como máximo ${MAX_IMPORT_ITEMS} archivos por importación.` }, { status: 400 });
  try {
    return NextResponse.json({ items: await previewImport(uid, items) });
  } catch (err) {
    return connectorErrorResponse(err);
  }
}
