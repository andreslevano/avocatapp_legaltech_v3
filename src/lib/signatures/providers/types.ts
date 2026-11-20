// E-signature providers behind one interface (docs/yousign/YOUSIGN_IMPLEMENTATION_PLAN.md §3).
// signatures/server.ts owns the Firestore record, locking, the timeline, notifications and filing;
// a provider only talks to its API. Server-only.

import type { SignatureOptions, SignatureRecipient, SignatureRequest, SigningOrder, SigningTarget } from '../types';
import type { DsEnvelopeSummary } from '../sync';

export type ProviderId = 'docusign' | 'yousign';

/** The sender, who signs first (DocuSign: the connected account; Yousign: the Avocat user). */
export interface ProviderOwner { name: string; email: string }

export interface CreateContext {
  uid: string;
  requestId: string;               // our signature_requests id (Yousign external_id, DocuSign customField)
  owner: ProviderOwner;
  html: string;                    // signing HTML (buildDocHtml forSignature) — DocuSign sends it as is
  markdown?: string;               // source text when the page had it (Yousign renders its own PDF)
  title: string;
  subject: string;
  message: string;
  signers: { name: string; email: string; accessCode?: string }[];
  cc: { name: string; email: string }[];
  signingOrder: SigningOrder;
  options: SignatureOptions;
}

/** Provider-specific ids stored on the request (merged into signature_requests/{id}). */
export type ExternalRefs = Partial<Pick<SignatureRequest, 'accountId' | 'envelopeId' | 'webhookTokenHash' | 'yousign'>>;

/**
 * Provider-neutral envelope state — the shape deriveSync merges (statuses: created | sent |
 * delivered | completed | declined | voided; recipients matched by recipientId = recipientKey).
 */
export type ProviderSummary = DsEnvelopeSummary;

export interface SignedFiles {
  /** The signed document (DocuSign: documents + Certificate of Completion in one PDF). */
  signedPdf: Buffer;
  /** Evidence files filed next to it (Yousign: one audit trail per signer; DocuSign: none, it's in the PDF). */
  auditTrails: { recipientKey: number; pdf: Buffer }[];
}

export interface SignatureProvider {
  id: ProviderId;
  resolveOwner(uid: string): Promise<ProviderOwner>;
  createAndSend(c: CreateContext): Promise<ExternalRefs>;
  /** Undo a just-created request when Avocat couldn't store it (never leave one Avocat doesn't know). */
  abandon(uid: string, refs: ExternalRefs, reason: string): Promise<void>;
  /** A fresh owner signing session ("Firmar ahora" / "Continuar firma"). Never stored. */
  ownerSigningSession(r: Pick<SignatureRequest, 'id' | 'userId' | 'recipients'> & ExternalRefs, embedOrigin?: string | null): Promise<SigningTarget>;
  remind(r: SignatureRequest, pending: SignatureRecipient[]): Promise<void>;
  /** 'recreate_required' when the provider can't change a signer on a live request. */
  updateSignerEmail(r: SignatureRequest, c: SignatureRecipient, email: string, name: string): Promise<'updated' | 'recreate_required'>;
  void(r: SignatureRequest, reason: string): Promise<void>;
  /** Current state for the manual, throttled "Actualizar estado" only (never polled). */
  fetchStatus(r: SignatureRequest): Promise<ProviderSummary>;
  /** Signed files for filing — called only from fileSignedDocument. */
  downloadSigned(r: SignatureRequest): Promise<SignedFiles>;
}
