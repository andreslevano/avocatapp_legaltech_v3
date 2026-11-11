'use client';

// In-app toasts when a counterparty opens, signs or declines (Phase 4). Listens to the user's
// signature_requests (webhook-driven) anywhere in the app; the first snapshot is the baseline,
// so nothing fires for changes that happened while the user was away.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { canUseDocusign } from '@/lib/docusign/config';
import { watchSignatureRequests } from '@/lib/signatures/client';
import type { SignatureRequest } from '@/lib/signatures/types';
import { recipientKey } from '@/lib/signatures/recipients';

interface Toast { id: string; text: string; tone: 'ok' | 'info' | 'err' }

const snapshotOf = (r: SignatureRequest) => ({
  status: r.status,
  filed: !!r.signedDocumentId,
  signers: Object.fromEntries(r.recipients.filter(x => x.role === 'signer').map(x => [recipientKey(x), x.status])),
});

export default function SignatureNotifier() {
  const { user, userDoc } = useAppAuth();
  const enabled = canUseDocusign(userDoc.plan, user);
  const seen = useRef<Map<string, ReturnType<typeof snapshotOf>> | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!enabled || !user) return;
    seen.current = null;
    return watchSignatureRequests(user.uid, rs => {
      const prev = seen.current;
      const next = new Map(rs.map(r => [r.id, snapshotOf(r)]));
      seen.current = next;
      if (!prev) return;                                            // baseline
      const fresh: Toast[] = [];
      for (const r of rs) {
        const before = prev.get(r.id);
        if (!before) continue;
        const what = `«${r.subject.replace(/^Firma solicitada:\s*/i, '')}»`;
        for (const x of r.recipients.filter(y => y.role === 'signer')) {
          const k = recipientKey(x);
          const was = before.signers[k];
          if (was === x.status) continue;
          if (x.status === 'delivered') fresh.push({ id: `${r.id}-${k}-d`, tone: 'info', text: `${x.name} ha abierto ${what}` });
          if (x.status === 'completed') fresh.push({ id: `${r.id}-${k}-c`, tone: 'ok', text: `${x.name} ha firmado ${what}` });
          if (x.status === 'declined') fresh.push({ id: `${r.id}-${k}-x`, tone: 'err', text: `${x.name} ha rechazado firmar ${what}` });
        }
        if (!before.filed && r.signedDocumentId) {
          fresh.push({ id: `${r.id}-filed`, tone: 'ok', text: `PDF firmado de ${what} guardado en Documentos` });
        }
      }
      if (fresh.length) setToasts(t => [...t.filter(o => !fresh.some(f => f.id === o.id)), ...fresh].slice(-4));
    });
  }, [enabled, user]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(ts => ts.slice(1)), 8000);
    return () => clearTimeout(t);
  }, [toasts]);

  if (!toasts.length) return null;
  return (
    <div className="fixed z-[60] right-3 bottom-20 md:bottom-4 flex flex-col gap-2 max-w-[calc(100vw-24px)] w-[340px]" role="status">
      {toasts.map(t => (
        <div key={t.id} className="bg-surface border border-border rounded-xl px-3.5 py-2.5 shadow-lg flex items-start gap-2.5">
          <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${t.tone === 'ok' ? 'bg-status-pagado-bg' : t.tone === 'err' ? 'bg-danger' : 'bg-accent'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-caption text-text leading-snug">{t.text}</p>
            <Link href="/documents" className="text-caption text-accent-text hover:underline">Ver en Documentos</Link>
          </div>
          <button onClick={() => setToasts(ts => ts.filter(o => o.id !== t.id))} aria-label="Cerrar"
            className="text-text-muted hover:text-text text-body-sm leading-none">×</button>
        </div>
      ))}
    </div>
  );
}
