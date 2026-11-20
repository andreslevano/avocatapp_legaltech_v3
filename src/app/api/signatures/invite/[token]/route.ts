import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { clientIp } from '@/lib/data-requests/server';
import { resolveInvite } from '@/lib/signatures/invites';
import { freshSigningLink } from '@/lib/signatures/providers/yousign';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

// GET /api/signatures/invite/{token} — the counterparty's /firma page (plan §6). Returns who sent
// what and, when it's their turn, a FRESH Yousign signing link (never stored; links expire in 48 h).
// Signed, voided, expired, declined and not-yet-your-turn get a state and no link.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!checkRateLimit(`sign-invite:${clientIp(req)}`).allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429, headers: NO_STORE });
  }
  try {
    const inv = await resolveInvite(params.token);
    if (inv.state !== 'open') {
      const { request: _ignored, ...rest } = inv as typeof inv & { request?: unknown };
      void _ignored;
      return NextResponse.json(rest, { headers: NO_STORE });
    }
    const link = await freshSigningLink(inv.request!, inv.recipientKey);
    return NextResponse.json({ state: 'open', ownerName: inv.ownerName, title: inv.title, signerName: inv.signerName, link }, { headers: NO_STORE });
  } catch (err) {
    console.error('[signatures/invite]', (err as Error)?.message);
    return NextResponse.json({ state: 'error' }, { status: 502, headers: NO_STORE });
  }
}
