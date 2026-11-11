import { fonts, primitives as P } from '@/lib/tokens';

// Email clients can't load web fonts reliably: DM Sans when installed, else the system UI font.
const EMAIL_FONT = fonts.sans.replace(/"/g, "'");
// "Enviar por email" on the admin-approval page (F1): the request email Avocat sends to the
// organisation's Microsoft 365 administrator. Pure — unit tested.

const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

export const CONSENT_PERMISSIONS = [
  'Microsoft Graph: User.Read, Files.Read.All, Sites.Read.All, offline_access',
  'SharePoint: AllSites.Read, MyFiles.Read',
];

export function adminConsentEmail(requester: { name: string; email: string }, url: string): { subject: string; text: string; html: string } {
  const who = requester.name ? `${requester.name} (${requester.email})` : requester.email;
  const subject = `Solicitud de aprobación: Avocat en Microsoft 365 — ${requester.name || requester.email}`;
  const text = [
    'Hola,',
    '',
    `${who} usa Avocat (avocatapp.com), una plataforma jurídica, y necesita importar documentos desde OneDrive / SharePoint.`,
    'Vuestra organización requiere que un administrador de Microsoft 365 apruebe la aplicación (una sola vez para toda la organización).',
    '',
    'Permisos solicitados (todos de solo lectura y delegados: solo acceden a lo que cada usuario ya puede ver):',
    ...CONSENT_PERMISSIONS.map(p => `- ${p}`),
    '',
    'Avocat nunca crea, modifica, mueve ni elimina nada en OneDrive o SharePoint: solo copia los archivos que el usuario elige.',
    '',
    'Para aprobarla, abre este enlace con una cuenta de administrador de Microsoft 365:',
    url,
    '',
    'Tras aprobarla, «Avocat» aparecerá en Microsoft Entra → Aplicaciones empresariales, donde podéis revisarla o retirarla cuando queráis.',
    '',
    `Si tienes dudas, responde a este email y le llegará a ${requester.email}.`,
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:${P['neutral-50']};font-family:${EMAIL_FONT};color:${P['neutral-900']}">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">Avocat</p>
<p style="font-size:14px;line-height:1.5">Hola,</p>
<p style="font-size:14px;line-height:1.5"><b>${esc(who)}</b> usa Avocat (avocatapp.com), una plataforma jurídica, y necesita importar documentos desde OneDrive / SharePoint. Vuestra organización requiere que un <b>administrador de Microsoft 365</b> apruebe la aplicación, una sola vez para toda la organización.</p>
<p style="font-size:13px;line-height:1.5;color:${P['neutral-600']}">Permisos solicitados — todos de <b>solo lectura</b> y delegados (solo acceden a lo que cada usuario ya puede ver):</p>
<ul style="font-size:13px;color:${P['neutral-600']};line-height:1.5">${CONSENT_PERMISSIONS.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
<p style="font-size:13px;line-height:1.5;color:${P['neutral-600']}">Avocat nunca crea, modifica, mueve ni elimina nada en OneDrive o SharePoint: solo copia los archivos que el usuario elige.</p>
<p style="margin:20px 0"><a href="${esc(url)}" style="background:${P['gold-500']};color:${P['neutral-900']};text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Revisar y aprobar Avocat</a></p>
<p style="font-size:12px;color:${P['neutral-500']};line-height:1.5">Ábrelo con una cuenta de administrador de Microsoft 365. Tras aprobarla, «Avocat» aparecerá en Microsoft Entra → Aplicaciones empresariales, donde podéis revisarla o retirarla cuando queráis.<br>Si tienes dudas, responde a este email y le llegará a ${esc(requester.email)}.</p>
</div></body></html>`;
  return { subject, text, html };
}
