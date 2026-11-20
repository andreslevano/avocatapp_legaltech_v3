'use client';

// The owner signs with Yousign inside Avocat (plan §6) — a modal on every device (no redirect).
// Opened via openOwnerSigning() when the request is a Yousign one. When it ends, the page goes to
// /signatures/return?event=… exactly like DocuSign, so the outcome handling is shared:
//   success → signing_complete (the others get Avocat's email) · declined → decline · closed → cancel
// The webhook (signer.done) is the source of truth if an iframe event is lost.
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { YOUSIGN_SIGNING_EVENT, type YousignSigningDetail } from '@/lib/signatures/client';
import YousignFrame, { type YousignFrameEvent } from './YousignFrame';

const returnHref = (requestId: string, event: string) =>
  `/signatures/return?rid=${encodeURIComponent(requestId)}&event=${encodeURIComponent(event)}`;

export default function YousignSigningHost() {
  const [session, setSession] = useState<YousignSigningDetail | null>(null);
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    const onOpen = (e: Event) => { done.current = false; setError(''); setSession((e as CustomEvent<YousignSigningDetail>).detail); };
    window.addEventListener(YOUSIGN_SIGNING_EVENT, onOpen);
    return () => window.removeEventListener(YOUSIGN_SIGNING_EVENT, onOpen);
  }, []);

  const finish = useCallback((requestId: string, event: string) => {
    if (done.current) return;
    done.current = true;
    window.location.assign(returnHref(requestId, event));
  }, []);

  const onEvent = useCallback((ev: YousignFrameEvent) => {
    if (!session) return;
    if (ev === 'success') finish(session.requestId, 'signing_complete');
    else if (ev === 'declined') finish(session.requestId, 'decline');
    else if (ev === 'error') setError('Yousign no pudo completar la firma. Puedes cerrar y volver a intentarlo con «Continuar firma».');
  }, [session, finish]);

  if (!session) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 bg-black/75" role="dialog" aria-modal="true" aria-label="Firma electrónica">
      <div className="relative w-full max-w-5xl h-full sm:h-[92vh] bg-white sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface border-b border-border">
          <p className="text-caption font-sans font-semibold text-text-heading truncate">Firma electrónica · {session.title}</p>
          <button onClick={() => finish(session.requestId, 'cancel')}
            className="min-h-touch sm:min-h-0 text-caption font-sans text-text-muted hover:text-text-heading transition-colors whitespace-nowrap">
            Firmar más tarde <X size={14} className="inline -mt-0.5" aria-hidden />
          </button>
        </div>
        <div className="relative flex-1 min-h-0">
          <YousignFrame src={session.url} title="Firma con Yousign" onEvent={onEvent} />
          {error && (
            <div role="alert" className="absolute inset-x-0 bottom-0 bg-danger-subtle border-t border-status-urgente-border px-4 py-3 text-caption text-danger-text">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
