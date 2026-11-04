// Expiry alert scan + daily digest (F3). Server-only (Admin SDK).
// Triggered hourly by the scheduled function `contractAlertsHourly` (functions/src/contract-alerts.ts)
// through POST /api/cron/contract-alerts:
//   • scan    — once per Madrid day (or on demand for one user, QA): rolls auto-renewals forward,
//               updates lifecycles and creates notifications; idempotent via contract_alerts/{key}.
//   • digests — every run: users whose digest hour is now get one grouped email per day.

import { authAdmin, db } from '@/lib/firebase-admin';
import { sendEmail, emailConfigured } from '@/lib/email';
import { canUseContracts } from './config';
import { lifecycleFor, madridHour, madridToday, nextContractEvent, rollForward } from './dates';
import { alertText, buildDigest, dueAlerts, normalizePrefs, type DigestItem, type NotificationPrefs } from './alerts';
import { CONTRACT_TYPE_LABEL, OPEN_LIFECYCLES, type Contract } from './types';

const contracts = () => db().collection('contracts');
const notifications = () => db().collection('notifications');
const nowIso = () => new Date().toISOString();

interface UserInfo { prefs: NotificationPrefs; email: string | null; enabled: boolean; digestSentOn: string | null }

async function loadUser(uid: string, cache: Map<string, UserInfo>): Promise<UserInfo> {
  const hit = cache.get(uid);
  if (hit) return hit;
  const u = (await db().collection('users').doc(uid).get()).data() ?? {};
  const email = (u.email as string | undefined) ?? null;
  // Domain preview needs a verified email (src/lib/preview.ts) — only Firebase Auth knows that.
  const emailVerified = await authAdmin().getUser(uid).then(a => a.emailVerified).catch(() => false);
  const info: UserInfo = {
    prefs: normalizePrefs(u.notificationPrefs),
    email,
    enabled: canUseContracts(u.plan as string | undefined, { email, emailVerified }),
    digestSentOn: (u.notificationDigestSentOn as string | undefined) ?? null,
  };
  cache.set(uid, info);
  return info;
}

export interface ScanResult { contracts: number; notifications: number; updated: number; skipped: boolean }

/** Daily scan. `uid` limits it to one user and ignores the once-a-day guard (QA). */
export async function runAlertScan(opts: { uid?: string; now?: Date } = {}): Promise<ScanResult> {
  const now = opts.now ?? new Date();
  const today = madridToday(now);
  if (!opts.uid) {
    // Once per Madrid day, even if the hourly trigger fires more often or retries.
    const marker = db().collection('system').doc('contract_alerts');
    const claimed = await db().runTransaction(async tx => {
      const s = await tx.get(marker);
      if (s.get('lastScanOn') === today) return false;
      tx.set(marker, { lastScanOn: today, startedAt: nowIso() }, { merge: true });
      return true;
    });
    if (!claimed) return { contracts: 0, notifications: 0, updated: 0, skipped: true };
  }

  try {
    return await scanContracts(today, opts.uid);
  } catch (err) {
    // Release the day so the trigger's retry (or the next hour) runs it again; alerts stay idempotent.
    if (!opts.uid) await db().collection('system').doc('contract_alerts').set({ lastScanOn: null }, { merge: true }).catch(() => {});
    throw err;
  }
}

async function scanContracts(today: string, uid?: string): Promise<ScanResult> {
  let q = contracts().where('confirmedByUser', '==', true).where('lifecycle', 'in', OPEN_LIFECYCLES);
  if (uid) q = q.where('userId', '==', uid);
  const snap = await q.get();
  const users = new Map<string, UserInfo>();
  let created = 0, updated = 0;

  for (const d of snap.docs) {
    let c = { id: d.id, ...(d.data() as Omit<Contract, 'id'>) } as Contract;
    const user = await loadUser(c.userId, users);
    if (!user.enabled) continue;

    const docSnap = await db().collection('documents').doc(c.documentId).get();
    if (!docSnap.exists) {
      // The document was deleted: retire the contract quietly.
      await d.ref.update({ lifecycle: 'superseded', updatedAt: nowIso() });
      updated++;
      continue;
    }

    // Auto-renewal and lifecycle.
    const rolled = rollForward(c.dates, c.term, today);
    const dates = rolled ?? c.dates;
    const lifecycle = lifecycleFor(c.lifecycle, dates, today) ?? c.lifecycle;
    if (rolled || lifecycle !== c.lifecycle) {
      await d.ref.update({ dates, lifecycle, updatedAt: nowIso() });
      await docSnap.ref.update({ contractLifecycle: lifecycle, contractNextDate: nextContractEvent(dates, today)?.date ?? null });
      c = { ...c, dates, lifecycle };
      updated++;
    }

    // An expired contract still gets its "venció" alert within the grace days.
    const forAlerts = lifecycle === 'expired' ? { ...c, lifecycle: 'expiring' as const } : c;
    for (const a of dueAlerts(forAlerts, today, user.prefs.thresholds)) {
      const marker = db().collection('contract_alerts').doc(a.key);
      const text = alertText(c.title, CONTRACT_TYPE_LABEL[c.type] ?? 'Contrato', a);
      const notif = notifications().doc();
      try {
        await db().runTransaction(async tx => {
          if ((await tx.get(marker)).exists) throw new Error('exists');
          tx.create(marker, { userId: c.userId, contractId: c.id, kind: a.kind, threshold: a.threshold, dueDate: a.dueDate, notificationId: notif.id, createdAt: nowIso() });
          tx.create(notif, {
            userId: c.userId, type: 'contract_expiry', contractId: c.id, documentId: c.documentId,
            kind: a.kind, threshold: a.threshold, dueDate: a.dueDate, severity: a.severity,
            title: text.title, body: text.body,
            readAt: null, emailed: false, createdAt: nowIso(),
          });
        });
        created++;
      } catch (err) {
        if ((err as Error).message !== 'exists') console.warn('[contract-alerts] alert', a.key, (err as Error).message);
      }
    }
  }
  return { contracts: snap.size, notifications: created, updated, skipped: false };
}

export interface DigestResult { users: number; sent: number; failed: number }

/**
 * Emails pending notifications to users whose digest hour is now (or to `uid` immediately, QA).
 * At most one digest per user per Madrid day.
 */
export async function sendDigests(opts: { uid?: string; now?: Date; appUrl?: string } = {}): Promise<DigestResult> {
  const now = opts.now ?? new Date();
  const today = madridToday(now);
  const hour = madridHour(now);
  const appUrl = opts.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com';
  let q = notifications().where('emailed', '==', false);
  if (opts.uid) q = q.where('userId', '==', opts.uid);
  const snap = await q.limit(2000).get();

  const byUser = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const d of snap.docs) byUser.set(d.get('userId'), [...(byUser.get(d.get('userId')) ?? []), d]);

  const users = new Map<string, UserInfo>();
  let sent = 0, failed = 0;
  for (const [uid, docs] of byUser) {
    const user = await loadUser(uid, users);
    if (!opts.uid && (user.prefs.digestHour !== hour || user.digestSentOn === today)) continue;
    const pending = docs.filter(d => !d.get('readAt'));
    const markEmailed = async (extra: Record<string, unknown>) => {
      const batch = db().batch();
      docs.forEach(d => batch.update(d.ref, { emailed: true, ...extra }));
      await batch.commit();
    };
    // Email off, nothing unread, or no address: don't send, but don't keep them queued either.
    if (!user.enabled || !user.prefs.email || !user.email || pending.length === 0 || !emailConfigured()) {
      await markEmailed({ emailSkipped: true });
      continue;
    }
    const items: DigestItem[] = pending.map(d => ({
      title: d.get('title'), body: d.get('body'), dueDate: d.get('dueDate'), severity: d.get('severity'),
    }));
    try {
      await sendEmail(user.email, buildDigest(items, appUrl));
      await markEmailed({ emailedAt: nowIso() });
      await db().collection('users').doc(uid).update({ notificationDigestSentOn: today });
      sent++;
    } catch (err) {
      failed++;
      console.error('[contract-alerts] digest', uid, (err as Error).message);
    }
  }
  return { users: byUser.size, sent, failed };
}
