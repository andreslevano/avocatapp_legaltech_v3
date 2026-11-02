// Signature requests (DocuSign "Firmar y enviar") — types shared by browser and server.

import { ACCESS_CODE_RE, MAX_CC, MAX_SIGNERS, type PartyInput, type SignerInput, type SigningOrder } from './recipients';
export type { PartyInput, SignerInput, SigningOrder };

export type SignatureStatus =
  | 'pending_owner' | 'sent' | 'delivered' | 'completed' | 'declined' | 'voided' | 'expired' | 'error';

export const TERMINAL_STATUSES: SignatureStatus[] = ['completed', 'declined', 'voided', 'expired', 'error'];
export const isActiveStatus = (s: SignatureStatus | null | undefined) => !!s && !TERMINAL_STATUSES.includes(s);

/** Spanish labels for the /documents chip (plan §4). */
export const SIGNATURE_STATUS_LABEL: Record<SignatureStatus, string> = {
  pending_owner: 'Pendiente de tu firma',
  sent: 'Enviado',
  delivered: 'Visto',
  completed: 'Firmado',
  declined: 'Rechazado',
  voided: 'Anulado',
  expired: 'Caducado',
  error: 'Error',
};

export interface SignatureRecipient {
  role: 'owner' | 'signer' | 'cc';
  name: string;
  email: string;
  recipientId?: number;           // DocuSign recipientId (5b); absent on older records = routingOrder
  routingOrder: number;
  accessCode?: boolean;           // an access code is required (the code itself is never stored)
  status: 'created' | 'sent' | 'delivered' | 'completed' | 'declined';
  signedAt?: string;
}

export interface SignatureOptions {
  reminderDelayDays: number;
  reminderFrequencyDays: number;
  expireAfterDays: number;
  language: 'es' | 'en';
}

export const DEFAULT_SIGNATURE_OPTIONS: SignatureOptions = {
  reminderDelayDays: 3, reminderFrequencyDays: 3, expireAfterDays: 30, language: 'es',
};

export interface SignatureEvent { type: string; at: string; by?: string }

/** Timeline copy for the /documents panel. */
export function signatureEventLabel(e: SignatureEvent): string {
  const who = e.by ? ` ${e.by}` : '';
  switch (e.type) {
    case 'created': return 'Solicitud creada';
    case 'owner_signed': return 'Firmado por ti y enviado';
    case 'owner_declined': return 'Rechazaste firmar';
    case 'recipient_delivered': return `Abierto por${who}`;
    case 'recipient_completed': return `Firmado por${who}`;
    case 'recipient_declined': return `Rechazado por${who}`;
    case 'reminded': return `Recordatorio enviado a${who}`;
    case 'email_corrected': return `Email corregido:${who}`;
    case 'completed': return 'Completado: todas las partes han firmado';
    case 'declined': return 'Firma rechazada';
    case 'voided': return 'Solicitud anulada';
    case 'expired': return 'Solicitud caducada';
    case 'filed': return 'PDF firmado guardado en Documentos';
    default: return e.type;
  }
}

export interface SignatureRequest {
  id: string;
  userId: string;
  documentId: string;
  caseId: string | null;
  clientId: string | null;
  provider: 'docusign';
  accountId: string;
  envelopeId: string;
  status: SignatureStatus;
  recipients: SignatureRecipient[];
  subject: string;
  message: string;
  options: SignatureOptions;
  events: SignatureEvent[];
  webhookTokenHash: string | null;
  signingOrder?: SigningOrder;    // 5b; older records: one counterparty
  lastSyncedAt?: string;          // last DocuSign status call (manual refresh, D9)
  lastRemindedAt?: string;
  signedDocumentId?: string;      // documents/{id} of the signed PDF (+ certificate) — Phase 4
  filingStartedAt?: string;       // lease while downloading/uploading the signed PDF
  filingError?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Body of POST /api/signatures. */
export interface CreateSignatureInput {
  documentId: string;
  /** The generated text, when the page has it (NDA, generación). Without it the saved .doc is used. */
  markdown?: string;
  title: string;
  /** Who signs after the owner (5b: 1–5). */
  signers: SignerInput[];
  cc?: PartyInput[];
  signingOrder?: SigningOrder;
  subject: string;
  message: string;
  options: SignatureOptions;
}

/** DocuSign return events (returnUrl ?event=…) → what the return page shows. */
export type ReturnOutcome = 'signed' | 'pending' | 'declined' | 'expired' | 'error';

export function outcomeForEvent(event: string | null | undefined): ReturnOutcome {
  switch (event) {
    case 'signing_complete': return 'signed';
    case 'decline': return 'declined';
    case 'ttl_expired':
    case 'session_timeout': return 'expired';
    case 'cancel':
    case 'viewing_complete':
    case 'fax_pending':
    case 'id_check_failed':
    case 'access_code_failed': return 'pending';
    default: return 'error';
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validates and clamps the user-supplied sheet input. Returns an error message or null. */
export function validateSignatureInput(i: Partial<CreateSignatureInput>): string | null {
  if (!i.documentId || typeof i.documentId !== 'string') return 'Falta el documento.';
  if (i.markdown !== undefined) {
    if (typeof i.markdown !== 'string' || i.markdown.length < 200) return 'El documento está vacío.';
    if (i.markdown.length > 200_000) return 'El documento es demasiado largo.';
  }
  const signers = Array.isArray(i.signers) ? i.signers : [];
  const cc = Array.isArray(i.cc) ? i.cc : [];
  if (!signers.length) return 'Indica quién debe firmar.';
  if (signers.length > MAX_SIGNERS) return `Máximo ${MAX_SIGNERS} firmantes.`;
  if (cc.length > MAX_CC) return `Máximo ${MAX_CC} personas en copia.`;
  for (const p of signers) {
    if (!p?.name?.trim()) return 'Indica el nombre de cada firmante.';
    if (!EMAIL_RE.test(p.email?.trim() ?? '')) return `El email de ${p.name.trim()} no es válido.`;
    if (p.accessCode !== undefined && p.accessCode !== '' && !ACCESS_CODE_RE.test(p.accessCode)) {
      return 'El código de acceso debe tener entre 4 y 20 letras o números.';
    }
  }
  for (const p of cc) {
    if (!EMAIL_RE.test(p?.email?.trim() ?? '')) return 'Un email en copia no es válido.';
  }
  const emails = [...signers, ...cc].map(p => p.email.trim().toLowerCase());
  if (new Set(emails).size !== emails.length) return 'Cada persona debe tener un email distinto.';
  if (i.signingOrder !== undefined && i.signingOrder !== 'sequential' && i.signingOrder !== 'parallel') return 'Orden de firma no válido.';
  if (!i.subject?.trim()) return 'Indica el asunto del email.';
  if (i.subject.trim().length > 100) return 'El asunto no puede superar 100 caracteres.';
  if ((i.message ?? '').length > 2000) return 'El mensaje no puede superar 2000 caracteres.';
  const o = i.options;
  if (o) {
    const ok = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
    if (!ok(o.reminderDelayDays, 1, 30) || !ok(o.reminderFrequencyDays, 1, 30)) return 'Recordatorios no válidos.';
    if (!ok(o.expireAfterDays, 1, 120)) return 'La caducidad debe estar entre 1 y 120 días.';
    if (o.language !== 'es' && o.language !== 'en') return 'Idioma no válido.';
  }
  return null;
}
