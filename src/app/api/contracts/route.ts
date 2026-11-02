import { NextRequest, NextResponse } from 'next/server';
import { contractErrorResponse, requireContractsUser } from '@/lib/contracts/route-helpers';
import { createContractFromNda } from '@/lib/contracts/server';
import type { NdaFormInput } from '@/lib/contracts/extract';

export const dynamic = 'force-dynamic';

// POST /api/contracts — contract record for an NDA generated in /tools/nda (F0, no LLM).
// Body: NdaFormInput (documentId + the form values). Idempotent per document.
export async function POST(req: NextRequest) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as Partial<NdaFormInput> | null;
  if (!b || typeof b.documentId !== 'string' || !b.divulgante?.nombre || !b.receptora?.nombre || typeof b.duracion !== 'string') {
    return NextResponse.json({ error: 'Datos del NDA incompletos.', code: 'invalid_input' }, { status: 400 });
  }
  try {
    const contract = await createContractFromNda(caller.uid, {
      documentId: b.documentId,
      title: String(b.title ?? 'NDA'),
      tipo: b.tipo === 'bilateral' ? 'bilateral' : 'unilateral',
      language: b.language === 'en' ? 'en' : 'es',
      divulgante: b.divulgante, receptora: b.receptora,
      duracion: b.duracion, jurisdiccion: String(b.jurisdiccion ?? ''), ciudadJurisdiccion: b.ciudadJurisdiccion,
      noCompetencia: !!b.noCompetencia, penalizacion: !!b.penalizacion,
      clientId: typeof b.clientId === 'string' ? b.clientId : null,
      renewsContractId: typeof b.renewsContractId === 'string' ? b.renewsContractId : null,
    });
    return NextResponse.json({ contract });
  } catch (err) {
    return contractErrorResponse(err);
  }
}
