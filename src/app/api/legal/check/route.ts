import { NextRequest, NextResponse } from 'next/server';
import { requireContractsUser } from '@/lib/contracts/route-helpers';
import { legalErrorResponse } from '@/lib/legal/route-helpers';
import { ContractError } from '@/lib/contracts/server';
import { runNdaCheck } from '@/lib/legal/check-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/legal/check { contractId } — "Revisar cambios legales" for ONE NDA (F2 step 2).
// The page loops over 1 / several / all NDAs, one request each.
export async function POST(req: NextRequest) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as { contractId?: unknown } | null;
  if (typeof b?.contractId !== 'string') return NextResponse.json({ error: 'Falta el contrato.' }, { status: 400 });
  try {
    return NextResponse.json({ check: await runNdaCheck(caller.uid, b.contractId) });
  } catch (err) {
    if (err instanceof ContractError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    return legalErrorResponse(err);
  }
}
