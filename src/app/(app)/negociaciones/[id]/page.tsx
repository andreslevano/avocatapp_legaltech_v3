'use client';

// /negociaciones/{id}[?clausula=c4] — one NDA negotiation, laid out by status (OwnerNegotiation).
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import OwnerNegotiation from '@/components/negotiations/OwnerNegotiation';
import { watchNegotiation } from '@/lib/negotiations/client';
import type { Negotiation } from '@/lib/negotiations/types';

function View({ id }: { id: string }) {
  const params = useSearchParams();
  const [n, setN] = useState<Negotiation | null | undefined>(undefined);
  useEffect(() => watchNegotiation(id, setN), [id]);
  if (n === undefined) return <p className="text-caption text-text-muted">Cargando…</p>;
  if (!n) return <Alert tone="warning" title="Negociación no encontrada">Puede que se haya eliminado o que no sea tuya.</Alert>;
  return (
    <>
      {params?.get('enviado') === '1' && n.round === 1 && n.status === 'en_revision' && (
        <Alert tone="success" className="mb-4">Borrador enviado a {n.counterparty.name} ({n.counterparty.email}).</Alert>
      )}
      <OwnerNegotiation n={n} focus={params?.get('clausula')} />
    </>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Negociación de NDA"
        actions={<Link href="/negociaciones"><Button variant="ghost" size="sm">Negociaciones</Button></Link>} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={null}><View id={params.id} /></Suspense>
        </div>
      </div>
    </div>
  );
}
