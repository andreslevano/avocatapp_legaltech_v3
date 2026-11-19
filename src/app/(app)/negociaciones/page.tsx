'use client';

// /negociaciones — the owner's NDA negotiations, most recent first.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { NegotiationStatusChip } from '@/components/negotiations/shared';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { watchNegotiations } from '@/lib/negotiations/client';
import { effectiveStatus } from '@/lib/negotiations/rules';
import type { Negotiation } from '@/lib/negotiations/types';

export default function Page() {
  const { user } = useAppAuth();
  const [items, setItems] = useState<Negotiation[] | null>(null);
  useEffect(() => (user ? watchNegotiations(user.uid, setItems) : undefined), [user]);

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Negociaciones" subtitle="NDA en revisión con la otra parte antes de firmar"
        actions={<Link href="/tools/nda"><Button variant="secondary" size="sm">Nuevo borrador</Button></Link>} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {items === null ? <p className="text-caption text-text-muted">Cargando…</p> : items.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl px-5 py-10 text-center space-y-2">
              <p className="text-small text-text">Aún no has negociado ningún NDA.</p>
              <p className="text-caption text-text-muted">En el NDA, pulsa «Generar borrador para negociar» para que la otra parte lo revise cláusula a cláusula antes de firmar.</p>
            </div>
          ) : (
            <ul className="bg-surface border border-border rounded-xl divide-y divide-border">
              {items.map(n => (
                <li key={n.id}>
                  <Link href={`/negociaciones/${n.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 min-h-touch hover:bg-surface-muted">
                    <span className="flex-1 min-w-0">
                      <span className="block text-small text-text truncate">{n.title}</span>
                      <span className="block text-caption text-text-muted">{n.counterparty.name} · ronda {n.round} · {new Date(n.updatedAt).toLocaleDateString('es-ES')}</span>
                    </span>
                    <NegotiationStatusChip status={effectiveStatus(n)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
