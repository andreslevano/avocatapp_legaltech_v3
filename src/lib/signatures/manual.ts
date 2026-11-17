// "Firma manuscrita": the owner signs with the handwritten signature saved in Perfil and Avocat
// emails the signed document as a PDF to the other parties, who sign by hand and reply.
// Validation + email content. Pure, unit tested; the route is /api/signatures/manual.
import { esc, layout } from '@/lib/data-requests/emails';
import { EMAIL_RE } from './types';

export const MANUAL_MAX_RECIPIENTS = 10;
export const MANUAL_MAX_CC = 10;
export const MANUAL_MESSAGE_MAX = 2000;

export interface ManualParty { name: string; email: string }
export interface ManualSendInput {
  documentId: string;
  signedDocumentId: string;
  recipients: ManualParty[];
  cc: ManualParty[];
  subject: string;
  message: string;
}

const party = (x: unknown): ManualParty | null => {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.replace(/[\r\n<>]/g, ' ').trim().slice(0, 120) : '';
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : '';
  return EMAIL_RE.test(email) ? { name, email } : null;
};

export function parseManualSend(body: unknown, ownerEmail?: string | null): { ok: true; input: ManualSendInput } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const id = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : '');
  const documentId = id(b.documentId), signedDocumentId = id(b.signedDocumentId);
  if (!documentId || !signedDocumentId) return { ok: false, error: 'Falta el documento.' };
  const rawR = Array.isArray(b.recipients) ? b.recipients : [];
  const rawC = Array.isArray(b.cc) ? b.cc : [];
  const recipients = rawR.map(party);
  const cc = rawC.map(party);
  if (!recipients.length) return { ok: false, error: 'Añade al menos un destinatario.' };
  if (recipients.some(r => !r) || cc.some(r => !r)) return { ok: false, error: 'Revisa los emails.' };
  if (recipients.length > MANUAL_MAX_RECIPIENTS || cc.length > MANUAL_MAX_CC) return { ok: false, error: 'Demasiados destinatarios.' };
  const all = [...recipients, ...cc].map(r => r!.email);
  if (new Set(all).size !== all.length) return { ok: false, error: 'Cada persona debe tener un email distinto.' };
  if (ownerEmail && all.includes(ownerEmail.toLowerCase())) return { ok: false, error: 'No te añadas como destinatario: recibirás una copia.' };
  const subject = typeof b.subject === 'string' ? b.subject.replace(/[\r\n]/g, ' ').trim().slice(0, 200) : '';
  const message = typeof b.message === 'string' ? b.message.slice(0, MANUAL_MESSAGE_MAX) : '';
  return { ok: true, input: { documentId, signedDocumentId, recipients: recipients as ManualParty[], cc: cc as ManualParty[], subject, message } };
}

export function manualSignedEmail(o: { ownerName: string; title: string; subject: string; message: string; recipientName: string }) {
  const subject = o.subject || `${o.ownerName} te envía «${o.title}» firmado`;
  const how = 'Revisa el documento adjunto, fírmalo a mano en tu bloque de firma y devuélvelo respondiendo a este email (escaneado o en foto).';
  const text = [
    o.message.trim() || `Hola${o.recipientName ? `, ${o.recipientName}` : ''}:`, '',
    `${o.ownerName} ya ha firmado «${o.title}». ${how}`, '',
    'Enviado con Avocat.',
  ].join('\n');
  const html = layout([
    ...(o.message.trim() ? o.message.trim().split(/\n{2,}/).map(p => esc(p).replace(/\n/g, '<br>')) : [`Hola${o.recipientName ? `, ${esc(o.recipientName)}` : ''}:`]),
    `<strong>${esc(o.ownerName)}</strong> ya ha firmado <strong>«${esc(o.title)}»</strong>.`,
    esc(how),
  ], null, 'Enviado con Avocat. Responde a este email para contestar directamente a quien te lo envía.');
  return { subject, text, html };
}
