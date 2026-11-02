import { NextRequest, NextResponse } from 'next/server';
import { contractErrorResponse, requireContractsUser } from '@/lib/contracts/route-helpers';
import { applyContractAction, type ContractAction } from '@/lib/contracts/server';

export const dynamic = 'force-dynamic';

const ACTIONS: ContractAction[] = ['snooze', 'let_expire', 'terminate', 'reactivate'];

// POST /api/contracts/[id]/action { action } — alert actions (F3): Posponer 7 días, Dejar vencer,
// Marcar como terminado, Reactivar avisos.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as { action?: unknown } | null;
  if (!ACTIONS.includes(b?.action as ContractAction)) return NextResponse.json({ error: 'Acción no válida.', code: 'invalid_input' }, { status: 400 });
  try {
    return NextResponse.json({ contract: await applyContractAction(caller.uid, params.id, b!.action as ContractAction) });
  } catch (err) {
    return contractErrorResponse(err);
  }
}
