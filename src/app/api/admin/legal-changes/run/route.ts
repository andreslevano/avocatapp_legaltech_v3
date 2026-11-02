import { NextRequest, NextResponse } from 'next/server';
import { legalErrorResponse, requireLegalAdmin } from '@/lib/legal/route-helpers';
import { runLegalMonitor } from '@/lib/legal/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/admin/legal-changes/run { days? } — "Buscar ahora": runs the monitor immediately
// (ignores the once-a-day guard; already-triaged items are skipped). days = BOE window (1–30).
export async function POST(req: NextRequest) {
  const uid = await requireLegalAdmin(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { days?: unknown } | null;
  const days = Number.isInteger(b?.days) ? Math.max(1, Math.min(30, b!.days as number)) : undefined;
  try {
    return NextResponse.json(await runLegalMonitor({ force: true, days }));
  } catch (err) {
    return legalErrorResponse(err);
  }
}
