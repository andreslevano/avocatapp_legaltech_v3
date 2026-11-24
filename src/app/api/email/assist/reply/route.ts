import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, requireEmailCaller } from '@/lib/email/server';
import { replyDraft } from '@/lib/email/assistant-server';
import { CORS_HEADERS, withCors } from '../_cors';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }); }

// POST /api/email/assist/reply { provider, ids, instructions?, summary? } → { draft, subject }.
// Only a draft to copy: Avocat never sends email.
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return withCors(c);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider)) return withCors(NextResponse.json({ error: 'Proveedor no válido.' }, { status: 400 }));
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((x): x is string => typeof x === 'string' && x.length < 400);
  if (!ids.length) return withCors(NextResponse.json({ error: 'Elige al menos un email.' }, { status: 400 }));
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  try {
    return withCors(NextResponse.json(await replyDraft(c, b.provider, ids, s(b.instructions, 1500), s(b.summary, 3000))));
  } catch (err) { return withCors(emailErrorResponse(err)); }
}
