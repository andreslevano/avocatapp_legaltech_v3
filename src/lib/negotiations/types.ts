// NDA negotiation — data model (negotiations/{id}, versions/{n}, events/{autoId}). Client-safe.
import type { ClauseLevel } from './levels';

export type NegotiationStatus = 'en_revision' | 'cambios_propuestos' | 'acordado' | 'cerrada' | 'revocada' | 'caducada';
export type Turn = 'tercero' | 'propietario';
export type ClauseState = 'pendiente' | 'aceptada' | 'propuesta' | 'comentada' | 'resuelta';
export type Party = 'tercero' | 'propietario';

export interface ClauseComment { by: Party; text: string; at: string; round: number }

export interface OwnerDecision {
  action: 'aceptar' | 'rechazar' | 'contrapropuesta';
  text?: string;
  reason?: string;
  at: string;
  round: number;
}

export interface NegClause {
  key: string;
  n: number;
  heading: string;
  level: ClauseLevel;
  /** Template text (version 1). */
  original: string;
  /** Text in force in the current version. */
  current: string;
  state: ClauseState;
  proposal?: { text: string; reason: string; at: string; round: number } | null;
  ownerDecision?: OwnerDecision | null;
  comments: ClauseComment[];
}

export interface Counterparty { name: string; email: string; company?: string }

export interface Negotiation {
  id: string;
  ownerId: string;
  orgId: null;
  clientId: string | null;
  templateId: string;
  templateVersion: string;
  /** Shown to the other party: "{ownerCompany} te ha enviado un borrador de NDA". */
  ownerCompany: string;
  title: string;
  draftDocumentId: string;
  finalDocumentId: string | null;
  counterparty: Counterparty;
  showLevels: boolean;
  status: NegotiationStatus;
  turn: Turn | null;
  round: number;
  /** Version in force (1 = the draft; +1 per change). */
  version: number;
  /** Hash of the latest link sent. */
  tokenHash: string | null;
  /** Hashes of every link sent since the last rotation (one per round): all keep working. */
  tokenHashes: string[];
  expiresAt: string;
  lastSentAt: string;
  sentCount: number;
  openedAt?: string | null;
  submittedAt?: string | null;
  agreedAt?: string | null;
  expiringNotifiedAt?: string | null;
  /** Untouchable parts of the document (header and parties / closing formula, signatures, annex). */
  preamble: string;
  tail: string;
  clauses: NegClause[];
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationVersion {
  n: number;
  round: number;
  by: Party;
  markdown: string;
  summary: { accepted: number; proposals: number; comments: number; decisions: number; changed: string[] };
  createdAt: string;
}

export type NegotiationEventType = 'created' | 'sent' | 'resent' | 'opened' | 'submitted' | 'responded' | 'accepted' | 'finalized' | 'revoked';

export interface NegotiationEvent { type: NegotiationEventType; by: Party | 'sistema'; at: string; round: number; detail?: string }

/** Denormalized on documents/{id} (server-only field). */
export interface DocumentNegotiation { id: string; status: NegotiationStatus; role: 'draft' | 'final' }

export const NEGOTIATION_STATUS_LABEL: Record<NegotiationStatus, string> = {
  en_revision: 'En revisión',
  cambios_propuestos: 'Cambios propuestos',
  acordado: 'Acordado',
  cerrada: 'Cerrada',
  revocada: 'Anulada',
  caducada: 'Enlace caducado',
};

export const CLAUSE_STATE_LABEL: Record<ClauseState, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  propuesta: 'Cambio propuesto',
  comentada: 'Comentada',
  resuelta: 'Resuelta',
};
