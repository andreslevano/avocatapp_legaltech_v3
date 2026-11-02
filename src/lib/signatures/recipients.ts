// Who signs in which order (Phase 5b). Pure — shared by the envelope builder and the stored request,
// so DocuSign recipient ids, routing orders and the "Firma:" anchors always line up.
//   owner           recipientId 1, routing 1, block 1 (always signs first, embedded)
//   signer i (0..)  recipientId i+2, block i+2; routing i+2 (sequential) or 2 for all (parallel)
//   cc j            recipientId after the signers; routing = the last signer's, so they are told
//                   when the last signature is requested, and DocuSign sends them the completed PDF.

export type SigningOrder = 'sequential' | 'parallel';
export interface PartyInput { name: string; email: string }
export interface SignerInput extends PartyInput { accessCode?: string }

export const MAX_SIGNERS = 5;
export const MAX_CC = 5;
/** Shared with the counterparty by another channel; DocuSign asks for it before opening. */
export const ACCESS_CODE_RE = /^[A-Za-z0-9]{4,20}$/;

export interface PlannedRecipient { recipientId: number; routingOrder: number }

export function planRecipients(signerCount: number, ccCount: number, order: SigningOrder) {
  const signers: PlannedRecipient[] = Array.from({ length: signerCount }, (_, i) => ({
    recipientId: i + 2,
    routingOrder: order === 'parallel' ? 2 : i + 2,
  }));
  const lastRouting = signers.reduce((m, s) => Math.max(m, s.routingOrder), 1);
  const cc: PlannedRecipient[] = Array.from({ length: ccCount }, (_, j) => ({
    recipientId: signerCount + 2 + j,
    routingOrder: lastRouting,
  }));
  return { signers, cc };
}

/** Stable key of a stored recipient (records before 5b have no recipientId: it equalled routingOrder). */
export const recipientKey = (r: { recipientId?: number; routingOrder: number }) => r.recipientId ?? r.routingOrder;
