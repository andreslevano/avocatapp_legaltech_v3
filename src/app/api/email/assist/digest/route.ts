import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, requireEmailCaller } from '@/lib/email/server';
import { digestEmails } from '@/lib/email/assistant-server';
import { CORS_HEADERS, withCors } from '../_cors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }); }

// POST /api/email/assist/digest { provider, purpose?, ids: string[] (≤ 25), attachments?: [{messageId, attachmentId, name}] }
// → { digest, sources, participants, suggestions, attachmentsRead }. Reads only; stores nothing.
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return withCors(c);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider)) return withCors(NextResponse.json({ error: 'Proveedor no válido.' }, { status: 400 }));
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((x): x is string => typeof x === 'string' && x.length < 400);
  const atts = (Array.isArray(b.attachments) ? b.attachments : []).map(a => a as Record<string, unknown>)
    .filter(a => typeof a.messageId === 'string' && typeof a.attachmentId === 'string')
    .map(a => ({ messageId: a.messageId as string, attachmentId: a.attachmentId as string, name: String(a.name ?? '') }));
  try {
    return withCors(NextResponse.json(await digestEmails(c, b.provider, typeof b.purpose === 'string' ? b.purpose.slice(0, 1000) : '', ids, atts)));
  } catch (err) { return withCors(emailErrorResponse(err)); }
}
