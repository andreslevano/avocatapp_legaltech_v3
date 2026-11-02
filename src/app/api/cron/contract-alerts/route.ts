import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAlertScan, sendDigests } from '@/lib/contracts/server-alerts';
import { runLegalMonitor } from '@/lib/legal/server';
import { madridHour } from '@/lib/contracts/dates';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// POST /api/cron/contract-alerts — called hourly by the scheduled function `contractAlertsHourly`
// with `Authorization: Bearer <CRON_SECRET>` (F3). The scan itself runs once per Madrid day.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (secret.length < 32 || !auth.startsWith('Bearer ') || !sameSecret(auth.slice(7), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const scan = await runAlertScan();
    // F2: legal-change monitor once a day from 09:00 Madrid (after the BOE's morning issue).
    // Isolated so a feed outage never blocks alerts or digests.
    let legal: unknown = null;
    if (madridHour() >= 9) legal = await runLegalMonitor().catch(e => ({ error: (e as Error).message }));
    const digests = await sendDigests();
    console.log('[contract-alerts] cron', JSON.stringify({ scan, legal, digests }));
    return NextResponse.json({ scan, legal, digests });
  } catch (err) {
    console.error('[contract-alerts] cron', (err as Error).message);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
