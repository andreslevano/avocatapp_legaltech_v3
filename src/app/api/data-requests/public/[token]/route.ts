import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { clientIp, errorResponse, getPublicView, submitPublic } from '@/lib/data-requests/server';
import { isTokenShape } from '@/lib/data-requests/token';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function limited(req: NextRequest): NextResponse | null {
  const rl = checkRateLimit(`data-request:${clientIp(req)}`);
  return rl.allowed ? null : NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429, headers: NO_STORE });
}

// GET /api/data-requests/public/{token} — public form data (owner name, documents, field list,
// prefilled name/email). Expired, revoked, used or unknown links get a status and no data.
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

// POST /api/data-requests/public/{token} — the client's answers (validated and sanitised server-side).
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
