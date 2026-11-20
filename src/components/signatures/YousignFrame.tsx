'use client';

// Yousign signing page embedded in an iframe (delivery_mode 'none'). No third-party script: the
// iframe posts { type: 'yousign', event: 'started' | 'success' | 'declined' | 'error' | 'ping' |
// 'signature.done', … } to the parent window, which we read here from Yousign's origins only.
// Never set redirect_urls on embedded signers: they disable these events.
import { useEffect, useRef, useState } from 'react';

export type YousignFrameEvent = 'started' | 'success' | 'declined' | 'error' | 'signature.done';

const YOUSIGN_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*yousign\.(app|com|tech)$/i;

export function isYousignMessage(origin: string, data: unknown): data is { type: 'yousign'; event: string } {
  if (!YOUSIGN_ORIGIN.test(origin)) return false;
  const d = data as { type?: unknown; event?: unknown } | null;
  return !!d && d.type === 'yousign' && typeof d.event === 'string';
}

export default function YousignFrame({ src, title, onEvent }: { src: string; title: string; onEvent: (e: YousignFrameEvent) => void }) {
  const [loaded, setLoaded] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isYousignMessage(e.origin, e.data)) return;
      const ev = e.data.event;
      if (ev === 'started' || ev === 'success' || ev === 'declined' || ev === 'error' || ev === 'signature.done') cb.current(ev);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (
    <div className="relative w-full h-full">
      <iframe src={src} title={title} onLoad={() => setLoaded(true)} referrerPolicy="strict-origin-when-cross-origin"
        allow="camera; clipboard-write" className="absolute inset-0 w-full h-full border-0 bg-white" />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white pointer-events-none">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-caption font-sans text-text-muted">Abriendo la firma…</p>
        </div>
      )}
    </div>
  );
}
