import { NextRequest, NextResponse } from 'next/server';
import { contractErrorResponse, requireContractsUser } from '@/lib/contracts/route-helpers';
import { extractContractForDocument } from '@/lib/contracts/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/contracts/extract { documentId } — "Analizar como contrato" (F0): text extraction +
// LLM structured extraction → unconfirmed contract record, returned for the confirmation sheet.
export async function POST(req: NextRequest) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as { documentId?: unknown } | null;
  if (typeof b?.documentId !== 'string') return NextResponse.json({ error: 'Falta el documento.', code: 'invalid_input' }, { status: 400 });
  try {
    return NextResponse.json({ contract: await extractContractForDocument(caller.uid, b.documentId) });
  } catch (err) {
    return contractErrorResponse(err);
  }
}
