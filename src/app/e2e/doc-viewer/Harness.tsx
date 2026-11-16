'use client';

import { useState } from 'react';
import DocViewerModal from '@/components/documents/DocViewerModal';
import DocRender from '@/components/documents/DocRender';
import type { DocumentRecord } from '@/lib/storage-client';

const base = { userId: 'u', caseId: null, storagePath: '', size: 2048 } as const;
const DOCS: DocumentRecord[] = [
  { ...base, id: 'pdf', name: 'Contrato.pdf', type: 'pdf', downloadUrl: '/e2e-files/sample.pdf' },
  { ...base, id: 'doc', name: 'NDA_Avocat.doc', type: 'doc', downloadUrl: '/e2e-files/nda.doc' },
  { ...base, id: 'docx', name: 'Demanda.docx', type: 'docx', downloadUrl: '/e2e-files/demanda.docx' },
  { ...base, id: 'xlsx', name: 'Datos.xlsx', type: 'xlsx', downloadUrl: '/e2e-files/datos.xlsx' },
] as DocumentRecord[];

export default function Harness() {
  const [open, setOpen] = useState<string | null>(null);
  const doc = DOCS.find(d => d.id === open);
  return (
    <div className="p-6 space-y-4 bg-bg min-h-screen">
      {DOCS.map(d => (
        <button key={d.id} id={`open-${d.id}`} className="block text-text underline" onClick={() => setOpen(d.id)}>{d.name}</button>
      ))}
      <div id="panel" className="w-[360px] h-64 border border-border"><DocRender doc={DOCS[1]} compact /></div>
      {doc && <DocViewerModal doc={doc} list={DOCS} onNavigate={d => setOpen(d.id)} onClose={() => setOpen(null)} />}
    </div>
  );
}
