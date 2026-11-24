import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, requireEmailCaller, searchEmail } from '@/lib/email/server';

export const dynamic = 'force-dynamic';

// POST /api/email/search { provider: 'gmail' | 'outlook', keywords?, from?, dateFrom?, dateTo? } — read-only.
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return c;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider)) return NextResponse.json({ error: 'Proveedor no válido.' }, { status: 400 });
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  try {
    const messages = await searchEmail(c, b.provider, { keywords: str(b.keywords), from: str(b.from), dateFrom: str(b.dateFrom), dateTo: str(b.dateTo) });
    return NextResponse.json({ messages });
  } catch (err) { return emailErrorResponse(err); }
}
