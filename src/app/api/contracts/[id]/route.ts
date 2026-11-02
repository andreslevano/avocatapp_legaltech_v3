import { NextRequest, NextResponse } from 'next/server';
import { contractErrorResponse, requireContractsUser } from '@/lib/contracts/route-helpers';
import { editContract } from '@/lib/contracts/server';
import { validateContractEdit } from '@/lib/contracts/extract';
import type { ContractEdit } from '@/lib/contracts/types';

export const dynamic = 'force-dynamic';

// PATCH /api/contracts/[id] { edit: ContractEdit, confirm?: boolean } — confirmation sheet (F0).
// Dates are always recomputed on the server from the effective date + term.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as { edit?: ContractEdit; confirm?: unknown } | null;
  const invalid = validateContractEdit(b?.edit ?? {});
  if (invalid) return NextResponse.json({ error: invalid, code: 'invalid_input' }, { status: 400 });
  try {
    return NextResponse.json({ contract: await editContract(caller.uid, params.id, b?.edit ?? {}, b?.confirm === true) });
  } catch (err) {
    return contractErrorResponse(err);
  }
}
