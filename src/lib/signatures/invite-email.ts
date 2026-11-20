// Email to a counterparty whose turn to sign has come (Yousign path — Avocat delivers the links).
// «<Nombre> (vía Avocat) te ha enviado un documento para firmar». Pure, unit tested.
import { esc, layout } from '@/lib/data-requests/emails';
import { formatContractDate } from '@/lib/contracts/dates';

export interface InviteEmailInput {
  ownerName: string;
  ownerEmail?: string | null;
  signerName: string;
  title: string;
  /** The owner's own message from the sheet (optional). */
  message?: string;
  subject?: string;
  link: string;
  expiresAt?: string | null;
  language: 'es' | 'en';
  reminder?: boolean;
}

export function signerInviteEmail(o: InviteEmailInput) {
  const en = o.language === 'en';
  const hi = o.signerName.trim().split(/\s+/)[0] || '';
  const subject = (o.subject?.trim() || (en
    ? `${o.ownerName} (via Avocat) has sent you a document to sign`
    : `${o.ownerName} (vía Avocat) te ha enviado un documento para firmar`)).slice(0, 150);
  const lead = o.reminder
    ? (en ? `Reminder: «${o.title}» is still waiting for your signature.` : `Recordatorio: «${o.title}» sigue pendiente de tu firma.`)
    : (en ? `${o.ownerName} has sent you «${o.title}» to sign. They have already signed it.` : `${o.ownerName} te ha enviado «${o.title}» para firmar. Ya lo ha firmado.`);
  const how = en
    ? 'Open the document, review it and sign online. You do not need an account. The signature is a simple electronic signature (eIDAS) provided by Yousign.'
    : 'Abre el documento, revísalo y fírmalo online. No necesitas crear una cuenta. Es una firma electrónica simple (eIDAS) con Yousign.';
  const exp = o.expiresAt ? (en ? `The request expires on ${o.expiresAt.slice(0, 10)}.` : `La solicitud caduca el ${formatContractDate(o.expiresAt.slice(0, 10))}.`) : '';
  const contact = o.ownerEmail ? (en ? `Questions? Reply to this email to reach ${o.ownerEmail}.` : `¿Dudas? Responde a este email para escribir a ${o.ownerEmail}.`) : '';
  const label = en ? 'Review and sign' : 'Revisar y firmar';
  const custom = (o.message ?? '').trim();
  const text = [
    `${en ? 'Hello' : 'Hola'}${hi ? `, ${hi}` : ''}:`, '', lead, ...(custom && !o.reminder ? ['', custom] : []), '', how, '',
    `${label}: ${o.link}`, '', exp, contact, '', en ? 'Sent with Avocat.' : 'Enviado con Avocat.',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  const html = layout([
    `${en ? 'Hello' : 'Hola'}${hi ? `, ${esc(hi)}` : ''}:`,
    esc(lead),
    ...(custom && !o.reminder ? custom.split(/\n{2,}/).map(p => esc(p).replace(/\n/g, '<br>')) : []),
    esc(how),
  ], { href: o.link, label }, [esc(exp), esc(contact), esc(en ? `Sent with Avocat on behalf of ${o.ownerName}.` : `Enviado con Avocat en nombre de ${o.ownerName}.`)].filter(Boolean).join('<br>'));
  return { subject, text, html };
}

/** The signed document, to the owner's CC recipients (Yousign path: Avocat sends it). */
export function ccCompletedEmail(o: { ownerName: string; title: string; language: 'es' | 'en' }) {
  const en = o.language === 'en';
  const subject = en ? `Signed: ${o.title}` : `Firmado: ${o.title}`;
  const line = en
    ? `All parties have signed «${o.title}». Here is your copy of the signed PDF, sent on behalf of ${o.ownerName}.`
    : `Todas las partes han firmado «${o.title}». Te enviamos tu copia del PDF firmado en nombre de ${o.ownerName}.`;
  return { subject, text: `${line}\n\n${en ? 'Sent with Avocat.' : 'Enviado con Avocat.'}`, html: layout([esc(line)], null, esc(en ? 'Sent with Avocat.' : 'Enviado con Avocat.')) };
}
