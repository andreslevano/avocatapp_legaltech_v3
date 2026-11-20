'use client';

// The counterparty signs here: Avocat asks Yousign for a fresh signing link and embeds it.
// No account needed. Simple electronic signature (eIDAS) by Yousign.
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Hourglass, Link2Off, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import YousignFrame, { type YousignFrameEvent } from '@/components/signatures/YousignFrame';

type View =
  | { state: 'open'; ownerName: string; title: string; signerName: string; link: string }
  | { state: 'signed' | 'voided' | 'expired' | 'declined' | 'not_your_turn'; ownerName: string; title: string }
  | { state: 'invalid' | 'error' };

function Msg({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <Icon size={40} className="mx-auto text-accent-text" aria-hidden />
        <h1 className="font-display text-h2 text-text-heading">{title}</h1>
        <div className="text-body-sm text-text-muted space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function SignInvite({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [done, setDone] = useState<'signed' | 'declined' | null>(null);
  const [frameError, setFrameError] = useState(false);

  const load = useCallback(() => {
    setView(null); setFrameError(false);
    fetch(`/api/signatures/invite/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(r => r.json()).then(setView).catch(() => setView({ state: 'error' }));
  }, [token]);
  useEffect(load, [load]);

  const onEvent = useCallback((e: YousignFrameEvent) => {
    if (e === 'success') setDone('signed');
    else if (e === 'declined') setDone('declined');
    else if (e === 'error') setFrameError(true);
  }, []);

  if (!view) return <div className="bg-bg min-h-[70vh]"><p className="text-body-sm text-text-muted text-center py-16">Cargando el documento…</p></div>;
  if (done === 'signed') {
    return <Msg icon={CheckCircle2} title="Documento firmado"><p>Gracias. Cuando firmen todas las partes, te enviaremos por email una copia del documento firmado.</p><p>Ya puedes cerrar esta página.</p></Msg>;
  }
  if (done === 'declined') return <Msg icon={X} title="Has rechazado firmar"><p>Hemos avisado a quien te lo envió.</p></Msg>;

  if (view.state !== 'open') {
    const who = 'ownerName' in view ? view.ownerName : 'quien te lo envió';
    const m = {
      signed: { icon: CheckCircle2, title: 'Ya está firmado', body: 'Ya firmaste este documento. No tienes que hacer nada más.' },
      voided: { icon: Link2Off, title: 'Solicitud anulada', body: `${who} ha anulado esta solicitud de firma.` },
      expired: { icon: Clock, title: 'La solicitud ha caducado', body: `Pide a ${who} que te la vuelva a enviar.` },
      declined: { icon: X, title: 'Firma rechazada', body: 'Esta solicitud se rechazó y ya no se puede firmar.' },
      not_your_turn: { icon: Hourglass, title: 'Todavía no es tu turno', body: 'Te avisaremos por email cuando puedas firmar.' },
      invalid: { icon: Link2Off, title: 'Enlace no válido', body: 'Revisa que has abierto el último enlace que te enviaron.' },
      error: { icon: Clock, title: 'No pudimos abrir el documento', body: 'Inténtalo de nuevo en unos minutos.' },
    }[view.state];
    return (
      <Msg icon={m.icon} title={m.title}>
        <p>{m.body}</p>
        {view.state === 'error' && <Button variant="secondary" size="md" onClick={load}>Reintentar</Button>}
      </Msg>
    );
  }

  return (
    <div className="bg-bg">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        <header className="space-y-1">
          <h1 className="text-body font-sans font-semibold text-text-heading">{view.ownerName} te ha enviado «{view.title}» para firmar</h1>
          <p className="text-caption text-text-muted">
            Hola, {view.signerName.split(' ')[0]}. Revisa el documento y fírmalo abajo. Firma electrónica simple (eIDAS) con Yousign; no necesitas cuenta.
          </p>
        </header>
        {frameError && (
          <Alert tone="danger" title="La firma no se pudo completar" action={<Button variant="secondary" size="sm" onClick={load}>Volver a cargar</Button>}>
            Vuelve a cargar el documento e inténtalo de nuevo.
          </Alert>
        )}
        <div className="h-[80vh] min-h-[560px] rounded-xl overflow-hidden border border-border bg-surface">
          <YousignFrame src={view.link} title={`Firma de ${view.title}`} onEvent={onEvent} />
        </div>
      </div>
    </div>
  );
}
