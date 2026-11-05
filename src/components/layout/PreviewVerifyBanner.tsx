'use client';

// Users at a preview organisation (PREVIEW_DOMAINS, e.g. mobilityforwork.es) get the preview features
// only with a verified email (src/lib/preview.ts). Email/password accounts start unverified, so this
// banner sends Firebase's verification email and refreshes the session once it's confirmed.

import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { PREVIEW_DOMAINS } from '@/lib/preview';
import { canUseContracts } from '@/lib/contracts/config';
import { canUseDocusign } from '@/lib/docusign/config';
import { canUseMicrosoft } from '@/lib/integrations/microsoft/config';

export default function PreviewVerifyBanner() {
  const { user, userDoc } = useAppAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'checking' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const domain = user?.email?.split('@')[1]?.toLowerCase() ?? '';
  if (!user || user.emailVerified || !PREVIEW_DOMAINS.includes(domain)) return null;
  // Named testers already have every preview feature without verifying: nothing to unlock.
  const plan = userDoc.plan;
  if (canUseDocusign(plan, user) && canUseMicrosoft(plan, user) && canUseContracts(plan, user)) return null;

  const send = async () => {
    setState('sending'); setMsg('');
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/profile` });
      setState('sent');
      setMsg(`Te hemos enviado un email a ${user.email}. Abre el enlace y vuelve aquí.`);
    } catch (e) {
      setState('error');
      setMsg(/too-many-requests/.test((e as Error).message) ? 'Ya te enviamos un email hace poco. Revisa tu bandeja (y spam).' : 'No se pudo enviar el email. Inténtalo más tarde.');
    }
  };
  const check = async () => {
    setState('checking');
    await user.reload().catch(() => {});
    if (user.emailVerified) {
      await user.getIdToken(true).catch(() => {});       // new token carries email_verified for the server
      window.location.reload();
      return;
    }
    setState('sent');
    setMsg('Aún no figura como verificado. Abre el enlace del email y vuelve a pulsar.');
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 bg-avocat-gold/10 border-b border-avocat-gold/20 text-[12px] font-sans">
      <span className="text-[#e8d4a0]">Verifica tu email para activar las funciones en vista previa de tu organización (firma DocuSign, OneDrive / SharePoint, contratos y avisos).</span>
      <span className="flex gap-3">
        <button onClick={send} disabled={state === 'sending'} className="text-avocat-gold hover:underline disabled:opacity-50">
          {state === 'sending' ? 'Enviando…' : state === 'sent' ? 'Reenviar email' : 'Enviar email de verificación'}
        </button>
        {(state === 'sent' || state === 'checking') && (
          <button onClick={check} disabled={state === 'checking'} className="text-avocat-gold hover:underline disabled:opacity-50">
            {state === 'checking' ? 'Comprobando…' : 'Ya lo he verificado'}
          </button>
        )}
      </span>
      {msg && <span className={`w-full text-[11px] ${state === 'error' ? 'text-red-400' : 'text-[#c8c0ac]'}`}>{msg}</span>}
    </div>
  );
}
