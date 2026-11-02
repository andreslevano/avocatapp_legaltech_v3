// Applying DocuSign envelope state to a signature request (Phase 3). Pure — unit tested.
// Used by the Connect webhook (payload envelopeSummary, D8) and the throttled manual refresh (D9).
// Merges are monotonic: statuses only move forward, so duplicate or out-of-order webhook
// deliveries are harmless and no timestamp bookkeeping is needed.

import type { SignatureEvent, SignatureRecipient, SignatureRequest, SignatureStatus } from './types';
import { TERMINAL_STATUSES } from './types';

/** The subset of a DocuSign envelope (REST v2.1 / Connect envelopeSummary) we read. */
export interface DsSigner {
  recipientId?: string;
  routingOrder?: string;
  name?: string;
  email?: string;
  status?: string;              // created | sent | delivered | signed | completed | declined | autoresponded
  deliveredDateTime?: string;
  signedDateTime?: string;
  declinedDateTime?: string;
  declinedReason?: string;
}

export interface DsEnvelopeSummary {
  envelopeId?: string;
  status?: string;              // created | sent | delivered | completed | declined | voided
  voidedReason?: string;
  statusChangedDateTime?: string;
  recipients?: { signers?: DsSigner[] };
}

export interface SyncResult {
  status: SignatureStatus;
  recipients: SignatureRecipient[];
  events: SignatureEvent[];      // new timeline entries only
  unlock: boolean;               // declined / voided / expired → document editable again (D11)
}

type RStatus = SignatureRecipient['status'];
const R_RANK: Record<RStatus, number> = { created: 0, sent: 1, delivered: 2, completed: 3, declined: 3 };
const S_RANK: Partial<Record<SignatureStatus, number>> = { pending_owner: 0, sent: 1, delivered: 2 };

function recipientStatus(s: string | undefined): RStatus | null {
  switch ((s ?? '').toLowerCase()) {
    case 'created': return 'created';
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'signed':
    case 'completed': return 'completed';
    case 'declined': return 'declined';
    default: return null;
  }
}

/** Connect payload → envelope summary. Falls back to the event name if includeData was missing. */
export function summaryFromConnect(body: unknown): DsEnvelopeSummary | null {
  const b = body as { event?: string; data?: { envelopeId?: string; envelopeSummary?: DsEnvelopeSummary } } | null;
  const envelopeId = b?.data?.envelopeId ?? b?.data?.envelopeSummary?.envelopeId;
  if (!envelopeId) return null;
  if (b?.data?.envelopeSummary) return { ...b.data.envelopeSummary, envelopeId };
  const m = /^envelope-(sent|delivered|completed|declined|voided)$/.exec(b?.event ?? '');
  return m ? { envelopeId, status: m[1] } : { envelopeId };
}

/**
 * Merges an envelope summary into the stored request. Returns null when nothing changes
 * (duplicate delivery, stale event, or the request is already terminal).
 */
export function deriveSync(current: Pick<SignatureRequest, 'status' | 'recipients'>, s: DsEnvelopeSummary, nowIso: string): SyncResult | null {
  if (TERMINAL_STATUSES.includes(current.status)) return null;

  const events: SignatureEvent[] = [];
  const signers = s.recipients?.signers ?? [];
  const recipients = current.recipients.map(r => {
    const ds = signers.find(x => String(x.routingOrder ?? x.recipientId) === String(r.routingOrder));
    if (!ds) return r;
    const next = recipientStatus(ds.status);
    let out: SignatureRecipient = r;
    // A corrected email (PATCH recipients) shows up here too.
    if (ds.email && ds.email.toLowerCase() !== r.email.toLowerCase()) out = { ...out, email: ds.email, name: ds.name || out.name };
    if (next && R_RANK[next] > R_RANK[r.status]) {
      out = { ...out, status: next };
      if (next === 'completed') out.signedAt = ds.signedDateTime ?? nowIso;
      // The owner "opening" is just them starting embedded signing — not worth a timeline entry.
      if ((next === 'delivered' && r.role !== 'owner') || next === 'completed' || next === 'declined') {
        const at = (next === 'delivered' ? ds.deliveredDateTime : next === 'completed' ? ds.signedDateTime : ds.declinedDateTime) ?? nowIso;
        events.push({ type: `recipient_${next}`, at, by: out.email });
      }
    }
    return out;
  });

  const owner = recipients.find(r => r.role === 'owner');
  const others = recipients.filter(r => r.role === 'signer');
  let status: SignatureStatus;
  switch ((s.status ?? '').toLowerCase()) {
    case 'completed': status = 'completed'; break;
    case 'declined': status = 'declined'; break;
    case 'voided': status = /expir/i.test(s.voidedReason ?? '') ? 'expired' : 'voided'; break;
    default:
      if (owner && owner.status !== 'completed') status = 'pending_owner';
      else if (others.length && others.every(r => R_RANK[r.status] >= R_RANK.delivered)) status = 'delivered';
      else status = 'sent';
      // Never move backwards among the active states.
      if ((S_RANK[status] ?? 0) < (S_RANK[current.status] ?? 0)) status = current.status;
  }

  if (status !== current.status && TERMINAL_STATUSES.includes(status)) {
    events.push({ type: status, at: s.statusChangedDateTime ?? nowIso });
  }

  const changed = status !== current.status || recipients.some((r, i) => r !== current.recipients[i]);
  if (!changed) return null;
  return { status, recipients, events, unlock: status === 'declined' || status === 'voided' || status === 'expired' };
}

/** D9: one DocuSign status call per envelope per 15 min. */
export const REFRESH_WINDOW_MS = 15 * 60 * 1000;

export function refreshAvailableAt(lastSyncedAt: string | null | undefined): number {
  const t = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  return Number.isFinite(t) ? t + REFRESH_WINDOW_MS : 0;
}

/** Reminders: at most one per hour per envelope (each resend is a DocuSign call on the envelope). */
export const REMIND_WINDOW_MS = 60 * 60 * 1000;
