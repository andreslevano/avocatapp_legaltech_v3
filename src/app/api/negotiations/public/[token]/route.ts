import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { clientIp, errorResponse } from '@/lib/data-requests/server';
import { isTokenShape } from '@/lib/data-requests/token';
import { getPublicView, submitPublic } from '@/lib/negotiations/server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function limited(req: NextRequest): NextResponse | null {
  const rl = checkRateLimit(`negotiation:${clientIp(req)}`);
  return rl.allowed ? null : NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429, headers: NO_STORE });
}

// GET /api/negotiations/public/{token} — the draft for the other party: owner company, title, round
// and the clauses (level only if the owner shows it). Expired, revoked, closed or agreed links and
// "not your turn" get a status and no clause text.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const tooMany = limited(req);
  if (tooMany) return tooMany;
  if (!isTokenShape(params.token)) return NextResponse.json({ status: 'invalida' }, { headers: NO_STORE });
  try {
    return NextResponse.json(await getPublicView(params.token), { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/negotiations/public/{token} { items: [{ key, action, text?, reason? }], acceptAll? }
// "Enviar propuesta" / "Acepto el borrador completo" — validated server-side (rules.ts).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const tooMany = limited(req);
  if (tooMany) return tooMany;
  if (!isTokenShape(params.token)) return NextResponse.json({ ok: false, status: 'invalida' }, { headers: NO_STORE });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const r = await submitPublic(params.token, body);
    return NextResponse.json(r, { status: r.ok ? 200 : r.status === 'invalid_input' ? 422 : 409, headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}
