'use client';

// DocuSign Focused View (Phase 5c): the owner signs in a modal on top of Avocat (desktop) instead
// of a full-page redirect. Mounted once in the app shell; opened via openOwnerSigning(). When the
// session ends, the page goes to /signatures/return?event=… exactly like the redirect flow, so the
// outcome handling is shared. If DocuSign's script can't load, falls back to the redirect.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { FOCUSED_SIGNING_EVENT, getSigningUrl, type FocusedSigningDetail } from '@/lib/signatures/client';
import { X } from 'lucide-react';
import { primitives } from '@/lib/tokens';

interface DsSigning {
  on(event: 'ready' | 'sessionEnd', cb: (e?: { sessionEndType?: string }) => void): void;
  mount(selector: string): void;
}
interface DsJs { signing(opts: Record<string, unknown>): DsSigning }
declare global {
  interface Window { DocuSign?: { loadDocuSign(integrationKey: string): Promise<DsJs> } }
}

const MOUNT_ID = 'avocat-focused-signing';
const READY_TIMEOUT_MS = 25_000;

const bundles = new Map<string, Promise<void>>();
function loadBundle(src: string): Promise<void> {
  if (window.DocuSign) return Promise.resolve();
  let p = bundles.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { bundles.delete(src); reject(new Error('DocuSign script failed to load')); };
      document.head.appendChild(s);
    });
    bundles.set(src, p);
  }
  return p;
}

const returnHref = (requestId: string, event: string) =>
  `/signatures/return?rid=${encodeURIComponent(requestId)}&event=${encodeURIComponent(event)}`;

export default function FocusedSigningHost() {
  const { user } = useAppAuth();
  const [session, setSession] = useState<FocusedSigningDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      done.current = false;
      setReady(false);
      setError('');
      setSession((e as CustomEvent<FocusedSigningDetail>).detail);
    };
    window.addEventListener(FOCUSED_SIGNING_EVENT, onOpen);
    return () => window.removeEventListener(FOCUSED_SIGNING_EVENT, onOpen);
  }, []);

  // Full navigation (not router.push): the return page reports the event once per load.
  const finish = useCallback((requestId: string, event: string) => {
    if (done.current) return;
    done.current = true;
    window.location.assign(returnHref(requestId, event));
  }, []);

  // The focused URL may already be used; ask for a fresh, plain one and redirect.
  const fallback = useCallback(async (requestId: string) => {
    if (done.current) return;
    done.current = true;
    try {
      window.location.assign((await getSigningUrl(user, requestId, { plain: true })).signingUrl);
    } catch (e) {
      done.current = false;
      setError((e as Error).message || 'No pudimos abrir DocuSign.');
    }
  }, [user]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let isReady = false;
    const timer = setTimeout(() => { if (!isReady && !cancelled) fallback(session.requestId); }, READY_TIMEOUT_MS);
    (async () => {
      try {
        await loadBundle(session.bundleUrl);
        if (!window.DocuSign) throw new Error('DocuSign not available');
        const docusign = await window.DocuSign.loadDocuSign(session.integrationKey);
        if (cancelled) return;
        const signing = docusign.signing({
          url: session.url,
          displayFormat: 'focused',
          style: {
            // DocuSign's iframe can't read CSS variables: pass the token values. Ink on gold (v4 accent rule).
            branding: { primaryButton: { backgroundColor: primitives['gold-500'], color: primitives['neutral-900'] } },
            signingNavigationButton: { finishText: 'Finalizar', position: 'bottom-center' },
          },
        });
        signing.on('ready', () => { isReady = true; if (!cancelled) setReady(true); });
        signing.on('sessionEnd', ev => finish(session.requestId, ev?.sessionEndType || 'cancel'));
        signing.mount(`#${MOUNT_ID}`);
      } catch (err) {
        console.warn('[focused-view]', (err as Error).message);
        if (!cancelled) fallback(session.requestId);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [session, fallback, finish]);

  if (!session) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" role="dialog" aria-modal="true" aria-label="Firma con DocuSign">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
          <p className="text-caption font-sans font-semibold text-text-heading">Firma con DocuSign</p>
          <button onClick={() => finish(session.requestId, 'cancel')}
            className="text-caption font-sans text-text-muted hover:text-text-heading transition-colors">
            Firmar más tarde <X size={14} className="inline -mt-0.5" aria-hidden />
          </button>
        </div>
        <div className="relative flex-1 min-h-0">
          <div id={MOUNT_ID} className="absolute inset-0" />
          {!ready && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white pointer-events-none">
              <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-caption font-sans text-text-muted">Abriendo DocuSign…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
              <p className="text-small font-sans text-danger-text">{error}</p>
              <button onClick={() => finish(session.requestId, 'cancel')} className="text-caption font-sans text-accent-text hover:underline">Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
