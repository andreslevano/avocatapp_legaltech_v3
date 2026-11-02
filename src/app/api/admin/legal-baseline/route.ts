import { NextRequest, NextResponse } from 'next/server';
import { legalErrorResponse, requireLegalAdmin } from '@/lib/legal/route-helpers';
import { seedBaseline, updateBaselineItem } from '@/lib/legal/check-server';

export const dynamic = 'force-dynamic';

// POST /api/admin/legal-baseline — key current law (F2, L2), admins only.
//   { action: 'seed' }                         → create the default items that don't exist yet
//   { action: 'save', id, patch: { requirement?, suggestedClause?, severity?, active?, validatedByLawyer? } }
export async function POST(req: NextRequest) {
  const uid = await requireLegalAdmin(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { action?: unknown; id?: unknown; patch?: Record<string, unknown> } | null;
  try {
    if (b?.action === 'seed') return NextResponse.json({ created: await seedBaseline() });
    if (b?.action === 'save' && typeof b.id === 'string' && b.patch && typeof b.patch === 'object') {
      const p = b.patch;
      const patch: Record<string, unknown> = {};
      if (typeof p.requirement === 'string' && p.requirement.trim() && p.requirement.length <= 1000) patch.requirement = p.requirement.trim();
      if (p.suggestedClause === null || (typeof p.suggestedClause === 'string' && p.suggestedClause.length <= 2000)) patch.suggestedClause = (p.suggestedClause as string | null)?.trim() || null;
      if (['critical', 'important', 'recommended'].includes(p.severity as string)) patch.severity = p.severity;
      if (typeof p.active === 'boolean') patch.active = p.active;
      if (typeof p.validatedByLawyer === 'boolean') { patch.validatedByLawyer = p.validatedByLawyer; patch.validatedBy = p.validatedByLawyer ? uid : null; }
      if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nada que guardar.' }, { status: 400 });
      await updateBaselineItem(b.id, patch);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (err) {
    return legalErrorResponse(err);
  }
}
