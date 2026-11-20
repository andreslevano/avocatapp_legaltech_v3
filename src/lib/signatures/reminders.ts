// Hourly cron: Avocat's signing reminders for Yousign requests (reminder-schedule.ts). Server-only.
import { db } from '@/lib/firebase-admin';
import { sendSignerInvites } from './invites';
import { reminderDue } from './reminder-schedule';
import type { SignatureRequest } from './types';

export async function sendDueSignatureReminders(now = new Date()): Promise<{ checked: number; reminded: number }> {
  const q = await db().collection('signature_requests').where('provider', '==', 'yousign').where('status', 'in', ['sent', 'delivered']).limit(500).get();
  let reminded = 0;
  for (const d of q.docs) {
    const r = { id: d.id, ...(d.data() as Omit<SignatureRequest, 'id'>) } as SignatureRequest & { lastAutoRemindedAt?: string };
    if (!reminderDue(r, now)) continue;
    // Claim first: two cron runs never remind twice.
    const claimed = await db().runTransaction(async tx => {
      const s = await tx.get(d.ref);
      if (s.get('lastAutoRemindedAt') !== r.lastAutoRemindedAt) return false;
      tx.update(d.ref, { lastAutoRemindedAt: now.toISOString() });
      return true;
    });
    if (!claimed) continue;
    const sent = await sendSignerInvites(r.id, { reminder: true }).catch(err => { console.error('[signatures] reminder', r.id, (err as Error).message); return []; });
    if (sent.length) reminded++;
  }
  return { checked: q.size, reminded };
}
