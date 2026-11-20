// When Avocat reminds counterparties (Yousign path: Avocat delivers the links, so it also sends the
// reminders — Yousign's own only exist as its emails and every 1/2/7/14 days). Pure, unit tested.
import type { SignatureRequest } from './types';

const DAY = 86_400_000;

/** Due when (first) `reminderDelayDays` after the invite, then every `reminderFrequencyDays`. */
export function reminderDue(r: Pick<SignatureRequest, 'status' | 'recipients' | 'options' | 'expiresAt'> & { lastAutoRemindedAt?: string }, now: Date): boolean {
  if (r.status !== 'sent' && r.status !== 'delivered') return false;
  if (r.expiresAt && r.expiresAt < now.toISOString().slice(0, 10)) return false;
  const pending = r.recipients.filter(x => x.role === 'signer' && (x.status === 'sent' || x.status === 'delivered') && x.invitedAt);
  if (!pending.length) return false;
  const invited = Math.min(...pending.map(x => Date.parse(x.invitedAt!)).filter(Number.isFinite));
  if (!Number.isFinite(invited)) return false;
  const last = r.lastAutoRemindedAt ? Date.parse(r.lastAutoRemindedAt) : NaN;
  const from = Number.isFinite(last) ? last : invited;
  const days = Number.isFinite(last) ? r.options?.reminderFrequencyDays ?? 3 : r.options?.reminderDelayDays ?? 3;
  return now.getTime() - from >= days * DAY - 30 * 60_000;      // hourly cron: half an hour of slack
}
