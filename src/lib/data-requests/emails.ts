// "Solicitar datos al cliente" emails (Spanish, plain text + HTML). Pure — unit tested.

import { fonts, primitives as P } from '@/lib/tokens';
import { formatContractDate } from '@/lib/contracts/dates';

const EMAIL_FONT = fonts.sans.replace(/"/g, "'");
const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

function layout(paragraphs: string[], button: { href: string; label: string }, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:${P['neutral-50']};font-family:${EMAIL_FONT};color:${P['neutral-900']}">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">Avocat</p>
${paragraphs.map(p => `<p style="font-size:14px;line-height:1.5;margin:0 0 12px">${p}</p>`).join('\n')}
<p style="margin:20px 0"><a href="${esc(button.href)}" style="background:${P['gold-500']};color:${P['neutral-900']};text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:bold">${esc(button.label)}</a></p>
<p style="font-size:12px;line-height:1.5;color:${P['neutral-500']}">${footer}</p>
</div></body></html>`;
}

/** To the client: "{Propietario} te pide unos datos para preparar {documentos}". */
export function clientRequestEmail(o: { ownerName: string; clientName: string; documents: string; link: string; expiresAt: string }) {
  const expires = formatContractDate(o.expiresAt.slice(0, 10));
  const subject = `${o.ownerName} te pide unos datos para preparar ${o.documents}`;
  const text = [
    `Hola, ${o.clientName}:`, '',
    `${o.ownerName} te pide unos datos para preparar: ${o.documents}.`,
    'Solo tienes que completar un formulario corto. No necesitas crear una cuenta.', '',
    `Completar mis datos: ${o.link}`, '',
    `El enlace caduca el ${expires} y solo se puede usar una vez.`, '',
    `Privacidad: ${o.ownerName} es responsable de tus datos y Avocat los trata por su cuenta, solo para preparar estos documentos.`,
    'Si no esperabas este mensaje, puedes ignorarlo o responder a este email.',
  ].join('\n');
  const html = layout([
    `Hola, ${esc(o.clientName)}:`,
    `<strong>${esc(o.ownerName)}</strong> te pide unos datos para preparar: <strong>${esc(o.documents)}</strong>.`,
    'Solo tienes que completar un formulario corto. No necesitas crear una cuenta.',
  ], { href: o.link, label: 'Completar mis datos' },
  `El enlace caduca el ${esc(expires)} y solo se puede usar una vez.<br>Privacidad: ${esc(o.ownerName)} es responsable de tus datos y Avocat los trata por su cuenta, solo para preparar estos documentos. Si no esperabas este mensaje, puedes ignorarlo o responder a este email.`);
  return { subject, text, html };
}

/** To the owner: "{Cliente} ha completado sus datos". */
export function ownerCompletedEmail(o: { clientName: string; documents: string; link: string }) {
  const subject = `${o.clientName} ha completado sus datos`;
  const text = [
    `${o.clientName} ha completado los datos que le pediste para preparar: ${o.documents}.`, '',
    `Abre Clientes para preparar los documentos: ${o.link}`,
  ].join('\n');
  const html = layout([
    `<strong>${esc(o.clientName)}</strong> ha completado los datos que le pediste para preparar: <strong>${esc(o.documents)}</strong>.`,
    'Los datos ya están en su ficha. Prepara cada documento con un clic y envíalo a firmar.',
  ], { href: o.link, label: 'Ver clientes' }, 'Recibes este email porque solicitaste los datos desde Avocat.');
  return { subject, text, html };
}
