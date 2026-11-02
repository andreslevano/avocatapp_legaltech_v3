import { NextRequest, NextResponse } from 'next/server';
import { requireContractsUser } from '@/lib/contracts/route-helpers';
import { runAlertScan, sendDigests } from '@/lib/contracts/server-alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/admin/contract-alerts { uid?, email? } — "Probar alertas" (F3 QA): runs the scan for one
// user now (ignores the once-a-day guard; alerts stay idempotent) and, with email: true, sends that
// user's digest immediately. Your own uid needs only the feature; another user's needs isAdmin.
export async function POST(req: NextRequest) {
  const caller = await requireContractsUser(req);
  if (caller instanceof NextResponse) return caller;
  const b = await req.json().catch(() => null) as { uid?: unknown; email?: unknown } | null;
  const uid = typeof b?.uid === 'string' && b.uid ? b.uid : caller.uid;
  if (uid !== caller.uid && !caller.isAdmin) return NextResponse.json({ error: 'Solo administradores.' }, { status: 403 });
  try {
    const scan = await runAlertScan({ uid });
    const digests = b?.email === true ? await sendDigests({ uid }) : null;
    return NextResponse.json({ scan, digests });
  } catch (err) {
    console.error('[contract-alerts] manual', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo ejecutar el escaneo.' }, { status: 500 });
  }
}
