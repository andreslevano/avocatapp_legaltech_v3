import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { processPendingYousignEvents, processStoredEvent } from '@/lib/signatures/webhook-events';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// POST /api/signatures/yousign/process { eventId } | { pending: true } — background processing of
// stored Yousign events (status, Avocat emails, filing). Called by the Firestore-trigger Cloud
// Function `processSignatureEvent` and the hourly cron with `Authorization: Bearer <CRON_SECRET>`.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (secret.length < 32 || !auth.startsWith('Bearer ') || !sameSecret(auth.slice(7), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { eventId?: unknown; pending?: unknown };
  try {
    if (body.pending === true) return NextResponse.json(await processPendingYousignEvents());
    if (typeof body.eventId !== 'string' || !/^[\w.-]{1,128}$/.test(body.eventId)) return NextResponse.json({ error: 'eventId' }, { status: 400 });
    return NextResponse.json({ outcome: await processStoredEvent(body.eventId) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message?.slice(0, 200) ?? 'error' }, { status: 500 });
  }
}
