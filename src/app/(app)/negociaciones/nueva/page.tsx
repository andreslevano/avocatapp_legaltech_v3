'use client';

// /negociaciones/nueva?draft={documentId} — prepare the negotiation of an NDA draft generated in the
// NDA tool ("Generar borrador para negociar"). The draft's markdown comes from the tool (this tab).
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import PrepareNegotiation from '@/components/negotiations/PrepareNegotiation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { readDraft, type DraftHandoff } from '@/lib/negotiations/client';

function NewNegotiation() {
  const { user } = useAppAuth();
  const params = useSearchParams();
  const draftId = params?.get('draft') ?? '';
  const [draft, setDraft] = useState<DraftHandoff | null | undefined>(undefined);
  useEffect(() => { setDraft(draftId ? readDraft(draftId) : null); }, [draftId]);

  if (orgNdaTemplateFor(user) !== 'mobilityforwork') {
    return <Alert tone="info">La negociación de NDA está disponible con la plantilla de NDA de tu organización.</Alert>;
  }
  if (draft === undefined) return <p className="text-caption text-text-muted">Cargando…</p>;
  if (!draft) {
    return (
      <Alert tone="warning" title="No encontramos el borrador"
        action={<Link href="/tools/nda"><Button variant="secondary" size="sm">Ir al NDA</Button></Link>}>
        Genera el borrador desde el NDA con «Generar borrador para negociar» y prepara la negociación en la misma pestaña.
      </Alert>
    );
  }
  return <PrepareNegotiation draft={draft} />;
}

export default function Page() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Preparar negociación" subtitle="Elige qué puede cambiar la otra parte y envíale el borrador"
        actions={<Link href="/negociaciones"><Button variant="ghost" size="sm">Negociaciones</Button></Link>} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={null}><NewNegotiation /></Suspense>
        </div>
      </div>
    </div>
  );
}
