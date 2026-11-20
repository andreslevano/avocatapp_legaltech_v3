// Yousign events / state → the provider-neutral summary deriveSync merges (plan §4). Pure.
//   signer.link_opened (counterparty) → recipient delivered (Visto)
//   signer.done (owner)               → owner completed; next signer(s) sent  → request 'sent'
//   signer.done (counterparty)        → recipient completed
//   signer.declined                   → recipient declined + request declined (unlock)
//   signature_request.done            → completed (filing)
//   signature_request.expired         → expired (voided with reason "expired") · .canceled → voided
//   signature_request.declined        → declined

import type { SignatureRequest } from '../../types';
import type { ProviderSummary } from '../types';
import type { YousignEvent } from './webhook';

type Rec = Pick<SignatureRequest, 'recipients' | 'yousign' | 'signingOrder'>;

/** recipientKey of a Yousign signer id on this request (null if unknown). */
export function keyForSigner(r: Pick<SignatureRequest, 'yousign'>, signerId: string | null): number | null {
  if (!signerId) return null;
  return r.yousign?.signers.find(s => s.signerId === signerId)?.recipientKey ?? null;
}

const atIso = (eventTime: string) => {
  const n = Number(eventTime);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : undefined;
};

export function summaryFromYousignEvent(r: Rec, ev: YousignEvent): ProviderSummary | null {
  const at = atIso(ev.eventTime);
  const key = keyForSigner(r, ev.signerId);
  const who = key !== null ? r.recipients.find(x => (x.recipientId ?? x.routingOrder) === key) : undefined;
  const one = (status: string, extra: Record<string, string | undefined> = {}) =>
    ({ recipients: { signers: [{ recipientId: String(key), status, ...extra }] } });

  switch (ev.eventName) {
    case 'signer.link_opened':
      if (!who || who.role === 'owner') return null;              // the owner opening is just them signing
      return one('delivered', { deliveredDateTime: at });
    case 'signer.done':
      if (!who) return null;
      if (who.role === 'owner') {
        if (who.status === 'completed') return null;              // already recorded (iframe return or a retry)
        // Their turn comes: the first in line (all of them when signing at once), as DocuSign reports.
        const next = r.recipients.filter(x => x.role === 'signer' && x.routingOrder === 2 && x.status === 'created');
        return { recipients: { signers: [
          { recipientId: String(key), status: 'completed', signedDateTime: at },
          ...next.map(x => ({ recipientId: String(x.recipientId ?? x.routingOrder), status: 'sent' })),
        ] } };
      }
      {
        // In order: the next counterparty's turn comes (Avocat emails them).
        const after = r.recipients.filter(x => x.role === 'signer' && x.routingOrder === who.routingOrder + 1 && x.status === 'created');
        return { recipients: { signers: [
          { recipientId: String(key), status: 'completed', signedDateTime: at },
          ...after.map(x => ({ recipientId: String(x.recipientId ?? x.routingOrder), status: 'sent' })),
        ] } };
      }
    case 'signer.declined':
      if (!who) return null;
      return { status: 'declined', statusChangedDateTime: at, ...one('declined', { declinedDateTime: at, declinedReason: ev.reason ?? undefined }) };
    case 'signature_request.done':
      return {
        status: 'completed', statusChangedDateTime: at,
        recipients: { signers: r.recipients.filter(x => x.role !== 'cc').map(x => ({ recipientId: String(x.recipientId ?? x.routingOrder), status: 'completed' })) },
      };
    case 'signature_request.declined': return { status: 'declined', statusChangedDateTime: at };
    case 'signature_request.expired': return { status: 'voided', voidedReason: 'expired', statusChangedDateTime: at };
    case 'signature_request.canceled': return { status: 'voided', voidedReason: 'canceled', statusChangedDateTime: at };
    default: return null;
  }
}

/** GET /signature_requests/{id} (manual "Actualizar estado") → summary. */
export function summaryFromYousignState(r: Rec, s: { status?: string; signers?: { id?: string; status?: string }[] }): ProviderSummary {
  const req = (s.status ?? '').toLowerCase();
  const status = req === 'done' ? 'completed' : req === 'declined' || req === 'rejected' ? 'declined'
    : req === 'expired' ? 'voided' : req === 'canceled' || req === 'deleted' ? 'voided' : undefined;
  const signers = (s.signers ?? []).map(x => {
    const key = keyForSigner(r, x.id ?? null);
    const st = (x.status ?? '').toLowerCase();
    const mapped = st === 'signed' ? 'completed' : st === 'declined' ? 'declined' : st === 'notified' ? 'sent' : null;
    return key !== null && mapped ? { recipientId: String(key), status: mapped } : null;
  }).filter((x): x is { recipientId: string; status: string } => !!x);
  return { ...(status ? { status } : {}), ...(req === 'expired' ? { voidedReason: 'expired' } : {}), recipients: { signers } };
}
