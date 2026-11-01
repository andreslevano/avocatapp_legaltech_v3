// Signature requests (DocuSign "Firmar y enviar") — types shared by browser and server.

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
  routingOrder: number;
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
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Body of POST /api/signatures. */
export interface CreateSignatureInput {
  documentId: string;
  markdown: string;
  title: string;
  counterparty: { name: string; email: string };
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
  if (!i.markdown || typeof i.markdown !== 'string' || i.markdown.length < 200) return 'El documento está vacío.';
  if (i.markdown.length > 200_000) return 'El documento es demasiado largo.';
  if (!i.counterparty?.name?.trim()) return 'Indica el nombre de la otra parte.';
  if (!EMAIL_RE.test(i.counterparty?.email?.trim() ?? '')) return 'El email de la otra parte no es válido.';
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
