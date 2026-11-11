'use client';

// DocuSign sends the owner back here after embedded signing: /signatures/return?rid=…&event=…
// The event is recorded server-side without asking DocuSign for status (D13b).

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getSigningUrl, openOwnerSigning, reportSigningReturn } from '@/lib/signatures/client';
import { outcomeForEvent, type SignatureRecipient, type SignatureStatus } from '@/lib/signatures/types';
import { Check, CircleAlert, Pause, Timer, X } from 'lucide-react';

type View = 'loading' | 'signed' | 'pending' | 'expired' | 'declined' | 'error' | 'done';

function ReturnInner() {
  const { user } = useAppAuth();
  const params = useSearchParams();
  const rid = params?.get('rid') ?? '';
  const event = params?.get('event') ?? '';
  const [view, setView] = useState<View>('loading');
  const [others, setOthers] = useState<SignatureRecipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const once = useRef(false);

  useEffect(() => {
    if (!user || !rid || once.current) return;
    once.current = true;
    reportSigningReturn(user, rid, event)
      .then(r => {
        setOthers(r.counterparties ?? (r.counterparty ? [r.counterparty] : []));
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
    try {
      const target = await getSigningUrl(user, rid);
      openOwnerSigning(rid, target);
      if (target.focused) setBusy(false);
    }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const many = others.length > 1;
  const who = others.length === 1 ? `${others[0].name} (${others[0].email})`
    : many ? others.map(o => o.name).join(', ') : 'la otra parte';

  const content: Record<Exclude<View, 'loading'>, { icon: React.ReactNode; title: string; text: string; resume?: boolean }> = {
    signed:   { icon: <Check size={18} aria-hidden />, title: `Firmado por ti. Enviado a ${who}.`,
                text: many
                  ? 'DocuSign les enviará un email para firmar (por turnos o a la vez, según elegiste). Cuando firmen todos, el documento quedará firmado.'
                  : 'DocuSign le ha enviado un email para firmar. Cuando firme, el documento quedará firmado por ambas partes.' },
    pending:  { icon: <Pause size={18} aria-hidden />, title: 'Pendiente de tu firma',
                text: 'Has salido sin firmar. La otra parte todavía no ha recibido nada: puedes continuar cuando quieras.', resume: true },
    expired:  { icon: <Timer size={18} aria-hidden />, title: 'La sesión de firma caducó',
                text: 'Por seguridad, la sesión de DocuSign tiene un tiempo límite. Tu envío sigue pendiente de tu firma.', resume: true },
    declined: { icon: <X size={18} aria-hidden />, title: 'Has rechazado firmar',
                text: 'Hemos anulado el envío y la otra parte no recibirá nada. El documento vuelve a estar desbloqueado.' },
    error:    { icon: <CircleAlert size={18} aria-hidden />, title: 'No pudimos completar la firma',
                text: 'Algo falló en DocuSign. Tu envío sigue pendiente de tu firma; inténtalo de nuevo.', resume: true },
    done:     { icon: <Check size={18} aria-hidden />, title: 'Este envío ya está en curso',
                text: 'No hay nada pendiente de tu firma en esta solicitud.' },
  };

  if (!rid) return <p className="text-small text-text-muted">Enlace de firma no válido.</p>;
  if (view === 'loading') return <p className="text-small text-text-muted">Comprobando la firma…</p>;

  const c = content[view];
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-body-sm font-semibold ${
          view === 'signed' || view === 'done' ? 'bg-success-subtle text-success-text'
          : view === 'declined' ? 'bg-danger-subtle text-danger-text' : 'bg-warning-subtle text-warning-text'}`}>{c.icon}</span>
        <div className="space-y-1">
          <h2 className="font-display text-h3 leading-tight text-text-heading">{c.title}</h2>
          <p className="text-small font-sans text-text-muted">{c.text}</p>
        </div>
      </div>
      {error && <p className="text-caption text-danger-text">{error}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <Link href="/documents"><Button variant="secondary" size="sm">Ver en Documentos</Button></Link>
        {c.resume
          ? <Button variant="accent" size="sm" loading={busy} onClick={resume}>Continuar firma</Button>
          : <Link href="/tools/nda"><Button variant="accent" size="sm">Nuevo NDA</Button></Link>}
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
          <Suspense fallback={<p className="text-small text-text-muted">Cargando…</p>}>
            <ReturnInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
