// Which documents can be sent to DocuSign from /documents, case detail… (Phase 5a). Pure.
// Only Word documents Avocat generated (the server rebuilds the signing HTML from the saved .doc);
// PDFs and uploads come later. Not while a request is active, and not once signed.

import { STAMP_SUFFIX_RE } from '@/lib/file-stamp';
import { isActiveStatus, type SignatureStatus } from './types';

export interface SignableDoc {
  type?: string;
  source?: string;
  kind?: string;
  signatureStatus?: SignatureStatus;
  /** NDA negotiation (src/lib/negotiations): only the agreed final version may be signed. */
  negotiation?: { id?: string; status?: string; role?: string } | null;
}

/** A document in a negotiation can be signed only if it is the final version of an agreed one. */
export function negotiationAllowsSignature(n: SignableDoc['negotiation']): boolean {
  if (!n) return true;
  return n.role === 'final' && n.status === 'acordado';
}

export function canSendForSignature(d: SignableDoc): boolean {
  if (!negotiationAllowsSignature(d.negotiation)) return false;
  if ((d.type ?? '').toLowerCase() !== 'doc') return false;
  if ((d.source ?? 'generated') !== 'generated') return false;
  if (d.kind === 'signed' || d.kind === 'certificate') return false;
  return !isActiveStatus(d.signatureStatus) && d.signatureStatus !== 'completed';
}

/** "NDA_MFW_MDC.doc" → "NDA MFW MDC" — envelope title / email subject. */
export function signatureTitleFromName(name: string): string {
  return (name || 'Documento').replace(/\.[^./\\]+$/, '').replace(/^\d{10,}_/, '').replace(STAMP_SUFFIX_RE, '').replace(/_/g, ' ').trim() || 'Documento';
}
