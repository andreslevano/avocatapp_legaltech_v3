import { NextRequest, NextResponse } from 'next/server';
import { legalErrorResponse, requireLegalAdmin } from '@/lib/legal/route-helpers';
import { approveChange, dismissChange, editChange } from '@/lib/legal/server';
import { isIsoDate } from '@/lib/contracts/dates';
import { LEGAL_TOPICS, type ChangeEdit, type LegalTopic } from '@/lib/legal/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function validEdit(e: unknown): ChangeEdit | null {
  if (!e || typeof e !== 'object') return {};
  const x = e as Record<string, unknown>;
  const out: ChangeEdit = {};
  const s = (k: 'title' | 'summary' | 'requirement', max: number) => {
    if (x[k] === undefined) return true;
    if (typeof x[k] !== 'string' || !(x[k] as string).trim() || (x[k] as string).length > max) return false;
    out[k] = (x[k] as string).trim();
    return true;
  };
  if (!s('title', 500) || !s('summary', 1500) || !s('requirement', 1000)) return null;
  if (x.severity !== undefined) {
    if (!['critical', 'important', 'recommended'].includes(x.severity as string)) return null;
    out.severity = x.severity as ChangeEdit['severity'];
  }
  if (x.suggestedClause !== undefined) {
    if (x.suggestedClause !== null && (typeof x.suggestedClause !== 'string' || x.suggestedClause.length > 2000)) return null;
    out.suggestedClause = (x.suggestedClause as string | null)?.trim() || null;
  }
  if (x.topics !== undefined) {
    if (!Array.isArray(x.topics) || x.topics.some(t => !LEGAL_TOPICS.includes(t as LegalTopic))) return null;
    out.topics = x.topics as LegalTopic[];
  }
  if (x.effectiveFrom !== undefined) {
    if (x.effectiveFrom !== null && !isIsoDate(x.effectiveFrom)) return null;
    out.effectiveFrom = x.effectiveFrom as string | null;
  }
  if (x.jurisdiction !== undefined) {
    if (x.jurisdiction !== 'ES' && x.jurisdiction !== 'EU') return null;
    out.jurisdiction = x.jurisdiction;
  }
  return out;
}

// POST /api/admin/legal-changes/[id] { action: 'save'|'approve'|'dismiss', edit? } — admin review (L1).
// approve = save edits, mark approved, flag affected NDAs and notify their owners.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireLegalAdmin(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { action?: unknown; edit?: unknown } | null;
  const edit = validEdit(b?.edit);
  if (!edit) return NextResponse.json({ error: 'Datos no válidos.' }, { status: 400 });
  try {
    if (b?.action === 'dismiss') { await dismissChange(params.id); return NextResponse.json({ ok: true }); }
    if (Object.keys(edit).length) await editChange(params.id, edit);
    if (b?.action === 'approve') return NextResponse.json({ ok: true, ...(await approveChange(uid, params.id)) });
    if (b?.action === 'save') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (err) {
    return legalErrorResponse(err);
  }
}
