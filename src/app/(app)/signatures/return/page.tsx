'use client';

// DocuSign sends the owner back here after embedded signing: /signatures/return?rid=…&event=…
// The event is recorded server-side without asking DocuSign for status (D13b).

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getSigningUrl, reportSigningReturn } from '@/lib/signatures/client';
import { outcomeForEvent, type SignatureRecipient, type SignatureStatus } from '@/lib/signatures/types';

type View = 'loading' | 'signed' | 'pending' | 'expired' | 'declined' | 'error' | 'done';

function ReturnInner() {
  const { user } = useAppAuth();
  const params = useSearchParams();
  const rid = params?.get('rid') ?? '';
  const event = params?.get('event') ?? '';
  const [view, setView] = useState<View>('loading');
  const [counterparty, setCounterparty] = useState<SignatureRecipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const once = useRef(false);

  useEffect(() => {
    if (!user || !rid || once.current) return;
    once.current = true;
    reportSigningReturn(user, rid, event)
      .then(r => {
        setCounterparty(r.counterparty);
        const s: SignatureStatus = r.status;
        if (s === 'pending_owner') {
          const o = outcomeForEvent(event);
          setView(o === 'signed' || o === 'declined' ? 'error' : o);
        } else if (s === 'voided') setView('declined');
        else if (s === 'sent' || s === 'delivered') setView('signed');
        else setView('done');
      })
      .catch(e => { setError((e as Error).message); setView('error'); });
  }, [user, rid, event]);

  const resume = async () => {
    setBusy(true); setError('');
    try { window.location.assign((await getSigningUrl(user, rid)).signingUrl); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const who = counterparty ? `${counterparty.name} (${counterparty.email})` : 'la otra parte';

  const content: Record<Exclude<View, 'loading'>, { icon: string; title: string; text: string; resume?: boolean }> = {
    signed:   { icon: '✓', title: `Firmado por ti. Enviado a ${who}.`,
                text: 'DocuSign le ha enviado un email para firmar. Cuando firme, el documento quedará firmado por ambas partes.' },
    pending:  { icon: '⏸', title: 'Pendiente de tu firma',
                text: 'Has salido sin firmar. La otra parte todavía no ha recibido nada: puedes continuar cuando quieras.', resume: true },
    expired:  { icon: '⏱', title: 'La sesión de firma caducó',
                text: 'Por seguridad, la sesión de DocuSign tiene un tiempo límite. Tu envío sigue pendiente de tu firma.', resume: true },
    declined: { icon: '✕', title: 'Has rechazado firmar',
                text: 'Hemos anulado el envío y la otra parte no recibirá nada. El documento vuelve a estar desbloqueado.' },
    error:    { icon: '!', title: 'No pudimos completar la firma',
                text: 'Algo falló en DocuSign. Tu envío sigue pendiente de tu firma; inténtalo de nuevo.', resume: true },
    done:     { icon: '✓', title: 'Este envío ya está en curso',
                text: 'No hay nada pendiente de tu firma en esta solicitud.' },
  };

  if (!rid) return <p className="text-[13px] text-[#9a9a9a]">Enlace de firma no válido.</p>;
  if (view === 'loading') return <p className="text-[13px] text-[#9a9a9a]">Comprobando la firma…</p>;

  const c = content[view];
  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold ${
          view === 'signed' || view === 'done' ? 'bg-emerald-500/15 text-emerald-400'
          : view === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{c.icon}</span>
        <div className="space-y-1">
          <h2 className="font-display text-[22px] leading-tight text-[#e8d4a0]">{c.title}</h2>
          <p className="text-[13px] font-sans text-[#9a9a9a]">{c.text}</p>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <Link href="/documents"><Button variant="BtnOutlineGold" size="sm">Ver en Documentos</Button></Link>
        {c.resume
          ? <Button variant="BtnGold" size="sm" loading={busy} onClick={resume}>Continuar firma</Button>
          : <Link href="/tools/nda"><Button variant="BtnGold" size="sm">Nuevo NDA</Button></Link>}
      </div>
    </div>
  );
}

export default function SignatureReturnPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Firma electrónica" subtitle="DocuSign" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-xl mx-auto">
          <Suspense fallback={<p className="text-[13px] text-[#9a9a9a]">Cargando…</p>}>
            <ReturnInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
