import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAlertScan, sendDigests } from '@/lib/contracts/server-alerts';
import { runLegalMonitor } from '@/lib/legal/server';
import { madridHour } from '@/lib/contracts/dates';
import { runNegotiationExpiryScan } from '@/lib/negotiations/server';
import { processPendingYousignEvents } from '@/lib/signatures/webhook-events';
import { sendDueSignatureReminders } from '@/lib/signatures/reminders';

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
    // NDA negotiations: "El enlace caduca en 2 días" (isolated, like the legal monitor).
    const negotiations = await runNegotiationExpiryScan().catch(e => ({ error: (e as Error).message }));
    // Yousign: events the trigger missed, and Avocat's own signing reminders (every N days).
    const signatureEvents = await processPendingYousignEvents().catch(e => ({ error: (e as Error).message }));
    const signatureReminders = await sendDueSignatureReminders().catch(e => ({ error: (e as Error).message }));
    const digests = await sendDigests();
    console.log('[contract-alerts] cron', JSON.stringify({ scan, legal, negotiations, signatureEvents, signatureReminders, digests }));
    return NextResponse.json({ scan, legal, negotiations, signatureEvents, signatureReminders, digests });
  } catch (err) {
    console.error('[contract-alerts] cron', (err as Error).message);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
