import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, requireEmailCaller } from '@/lib/email/server';
import { assistSearch } from '@/lib/email/assistant-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/email/assist/search { provider, purpose?, keywords?, from?, dateFrom?, dateTo? }
// → { plan, usedPlan, results (ranked, with reason), threads }. Read-only.
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return c;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider)) return NextResponse.json({ error: 'Proveedor no válido.' }, { status: 400 });
  const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  try {
    return NextResponse.json(await assistSearch(c, b.provider, s(b.purpose, 1000) ?? '', { keywords: s(b.keywords), from: s(b.from), dateFrom: s(b.dateFrom, 10), dateTo: s(b.dateTo, 10) }));
  } catch (err) { return emailErrorResponse(err); }
}
