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

export default function AdminConsentView({ adminConsentUrl, returnTo }: { adminConsentUrl: string; returnTo: string }) {
  const { user } = useAppAuth();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(adminConsentUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt('Copia este enlace:', adminConsentUrl); }
  };

  const retry = async () => {
    setRetrying(true);
    try { await startMicrosoftConnect(user, { returnTo, intent: 'import' }); }
    catch { setRetrying(false); }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(mailBody(adminConsentUrl))}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Conectar con Microsoft" />
      <div className="flex-1 overflow-y-auto flex items-start md:items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-[22px] text-[#e8d4a0] leading-tight">
            Tu organización requiere que un administrador apruebe Avocat.
          </h2>
          <p className="text-[13px] text-[#c8c0ac] leading-relaxed">
            Envía este enlace a la persona que administra Microsoft 365 en tu organización. Cuando lo apruebe,
            vuelve aquí y pulsa «Reintentar».
          </p>
          <p className="text-[11px] text-[#6b6050] leading-relaxed">
            Avocat solo pide permisos de lectura y nunca modifica ni borra nada en OneDrive o SharePoint.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="BtnGold" size="sm" onClick={copy}>{copied ? 'Enlace copiado ✓' : 'Copiar enlace para tu administrador'}</Button>
            <a href={mailto}><Button variant="BtnOutlineDark" size="sm" fullWidth>Enviar por email</Button></a>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#2e2b20]">
            <Link href={returnTo} className="text-[12px] text-[#6b6050] hover:text-[#c8c0ac]">← Volver</Link>
            <Button variant="BtnGhost" size="sm" loading={retrying} onClick={retry}>Reintentar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
