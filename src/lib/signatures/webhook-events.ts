// Yousign webhook events store + background processing (plan §7). Server-only.
//   signature_webhook_events/{event_id} — server-only (catch-all deny); written by the webhook
//   route (create → duplicates are ignored), processed by /api/signatures/yousign/process (called
//   by a Firestore-trigger Cloud Function) and retried by the hourly cron.

import { db } from '@/lib/firebase-admin';
import { processYousignEvent } from './server';
import type { YousignEvent } from './providers/yousign/webhook';

const events = () => db().collection('signature_webhook_events');
export const MAX_ATTEMPTS = 5;
const RETRY_AFTER_MS = 2 * 60_000;

/** Stores the event once. Returns false when it was already stored (a Yousign retry). */
export async function storeYousignEvent(
  ev: YousignEvent,
  create: (id: string, data: Record<string, unknown>) => Promise<unknown> = (id, data) => events().doc(id).create(data),
): Promise<boolean> {
  try {
    await create(ev.eventId, { ...ev, receivedAt: new Date().toISOString(), processedAt: null, attempts: 0 });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 6) return false;          // ALREADY_EXISTS
    throw err;
  }
}

/** Processes one stored event (idempotent; a processed event is a no-op). */
export async function processStoredEvent(eventId: string): Promise<string> {
  const ref = events().doc(eventId);
  const claim = await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) return null;
    if (s.get('processedAt')) return 'done';
    const attempts = Number(s.get('attempts') ?? 0);
    if (attempts >= MAX_ATTEMPTS) return 'gave_up';
    const lease = s.get('leaseUntil') as string | undefined;
    if (lease && lease > new Date().toISOString()) return 'busy';
    tx.update(ref, { attempts: attempts + 1, leaseUntil: new Date(Date.now() + 5 * 60_000).toISOString() });
    return { ...(s.data() as YousignEvent) };
  });
  if (!claim || typeof claim === 'string') return claim ?? 'missing';
  try {
    const outcome = await processYousignEvent(claim);
    await ref.update({ processedAt: new Date().toISOString(), outcome, leaseUntil: null, error: null });
    return outcome;
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error('[yousign] process event', eventId, msg);
    await ref.update({ leaseUntil: null, error: msg.slice(0, 300) }).catch(() => {});
    throw err;
  }
}

/** Hourly safety net: events not processed after 2 minutes (trigger missed or failed). */
export async function processPendingYousignEvents(limit = 50): Promise<{ checked: number; processed: number }> {
  const cutoff = new Date(Date.now() - RETRY_AFTER_MS).toISOString();
  const q = await events().where('processedAt', '==', null).where('receivedAt', '<=', cutoff).orderBy('receivedAt').limit(limit).get();
  let processed = 0;
  for (const d of q.docs) {
    if (Number(d.get('attempts') ?? 0) >= MAX_ATTEMPTS) continue;
    await processStoredEvent(d.id).then(() => { processed++; }).catch(() => {});
  }
  return { checked: q.size, processed };
}
