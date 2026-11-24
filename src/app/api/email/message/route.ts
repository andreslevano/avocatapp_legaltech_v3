import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, readEmail, requireEmailCaller } from '@/lib/email/server';

export const dynamic = 'force-dynamic';

// POST /api/email/message { provider, id } — one email with its text and attachment names (read-only).
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return c;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider) || typeof b.id !== 'string') return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 });
  try { return NextResponse.json({ message: await readEmail(c, b.provider, b.id) }); } catch (err) { return emailErrorResponse(err); }
}
