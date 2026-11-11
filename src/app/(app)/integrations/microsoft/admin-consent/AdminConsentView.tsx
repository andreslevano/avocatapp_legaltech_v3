'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { startMicrosoftConnect } from '@/lib/integrations/microsoft/client';

const MAIL_SUBJECT = 'Aprobar la aplicación Avocat en Microsoft 365';

function mailBody(url: string) {
  return [
    'Hola,',
    '',
    'Uso Avocat (avocatapp.com), una plataforma jurídica, y necesito importar documentos desde OneDrive / SharePoint.',
    'Nuestra organización requiere que un administrador apruebe la aplicación.',
    '',
    'Permisos solicitados (todos de solo lectura, delegados — solo acceden a lo que cada usuario ya puede ver):',
    '- Microsoft Graph: User.Read, Files.Read.All, Sites.Read.All, offline_access',
    '- SharePoint: AllSites.Read, MyFiles.Read',
    '',
    'Avocat nunca crea, modifica, mueve ni elimina nada en OneDrive o SharePoint: solo copia los archivos que el usuario elige.',
    '',
    'Enlace de aprobación para administradores:',
    url,
    '',
    'Gracias.',
  ].join('\n');
}

/** declined: Microsoft returned "consent declined" (AADSTS65004) — either the admin-approval screen was
 *  left, or the user said no to the permissions. The page covers both. */
export default function AdminConsentView({ adminConsentUrl, tid = null, returnTo, declined = false }: {
  adminConsentUrl: string; tid?: string | null; returnTo: string; declined?: boolean;
}) {
  const { user } = useAppAuth();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // "Enviar por email": Avocat sends it (a mailto: link does nothing without a desktop mail app).
  const [mailOpen, setMailOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [mailResult, setMailResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    setSending(true); setMailResult(null);
    try {
      const res = await fetch('/api/integrations/microsoft/admin-consent-request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: adminEmail.trim(), tid }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el email.');
      setMailResult({ ok: true, text: `Enviado a ${adminEmail.trim()}. Si responde, te llegará a ti.` });
      setMailOpen(false);
    } catch (e) {
      setMailResult({ ok: false, text: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(adminConsentUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt('Copia este enlace:', adminConsentUrl); }
  };

  const retry = async () => {
    setRetrying(true);
    try { await startMicrosoftConnect(user, { returnTo, intent: 'import' }); }
    catch { setRetrying(false); }
  };

  const to = encodeURIComponent(adminEmail.trim());
  const subject = encodeURIComponent(MAIL_SUBJECT);
  const body = encodeURIComponent(mailBody(adminConsentUrl));
  const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
  // Web compose links work without a desktop mail app (Microsoft 365 users usually have Outlook on the web).
  const outlookWeb = `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
  const gmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Conectar con Microsoft" />
      <div className="flex-1 overflow-y-auto flex items-start md:items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-[22px] text-[#e8d4a0] leading-tight">
            {declined ? '¿Microsoft te pidió la aprobación de un administrador?' : 'Tu organización requiere que un administrador apruebe Avocat.'}
          </h2>
          {declined && (
            <p className="text-[13px] text-[#c8c0ac] leading-relaxed">
              Si viste «Se necesita la aprobación del administrador», tu organización no permite que cada usuario
              autorice aplicaciones: un administrador de Microsoft 365 debe aprobar Avocat una sola vez para todos.
            </p>
          )}
          <p className="text-[13px] text-[#c8c0ac] leading-relaxed">
            Envía este enlace a la persona que administra Microsoft 365 en tu organización. Cuando lo apruebe,
            vuelve aquí y pulsa «Reintentar».
          </p>
          {declined && (
            <p className="text-[12px] text-[#6b6050] leading-relaxed">
              Si solo cancelaste los permisos, pulsa «Reintentar» y acéptalos.
            </p>
          )}
          <p className="text-[11px] text-[#6b6050] leading-relaxed">
            Avocat solo pide permisos de lectura y nunca modifica ni borra nada en OneDrive o SharePoint.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="accent" size="sm" onClick={copy}>{copied ? 'Enlace copiado' : 'Copiar enlace para tu administrador'}</Button>
            <Button variant="secondary" size="sm" onClick={() => { setMailOpen(o => !o); setMailResult(null); }}>Enviar por email</Button>
          </div>
          {mailOpen && (
            <div className="rounded-xl border border-[#2e2b20] bg-[#161410] p-3 space-y-2">
              <label htmlFor="admin-email" className="block text-[11px] text-[#c8c0ac]">Email del administrador de Microsoft 365</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input id="admin-email" type="email" autoFocus value={adminEmail} placeholder="it@tuempresa.com"
                  onChange={e => setAdminEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && adminEmail.trim()) send(); }}
                  className="flex-1 bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40" />
                <Button variant="accent" size="sm" loading={sending} disabled={!adminEmail.trim()} onClick={send}>Enviar</Button>
              </div>
              <p className="text-[11px] text-[#6b6050]">Lo enviamos desde Avocat con el enlace de aprobación; las respuestas te llegarán a ti.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6b6050]">
                <span>O escríbelo tú desde:</span>
                <a href={outlookWeb} target="_blank" rel="noopener noreferrer" className="text-avocat-gold hover:underline">Outlook web</a>
                <a href={gmailWeb} target="_blank" rel="noopener noreferrer" className="text-avocat-gold hover:underline">Gmail</a>
                <a href={mailto} className="text-avocat-gold hover:underline">Tu programa de correo</a>
              </div>
            </div>
          )}
          {mailResult && <p className={`text-[12px] ${mailResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{mailResult.text}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-[#2e2b20]">
            <Link href={returnTo} className="text-[12px] text-[#6b6050] hover:text-[#c8c0ac]">← Volver</Link>
            <Button variant="ghost" size="sm" loading={retrying} onClick={retry}>Reintentar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
