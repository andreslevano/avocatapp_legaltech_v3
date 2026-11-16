'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import ClientsBulkBar from '@/components/clients/ClientsBulkBar';
import type { ClientDoc } from '@/lib/firestore';
import { REQUESTABLE_DOCS } from '@/lib/data-requests/catalog';

const user = { uid: 'e2e-user', email: 'ana@bufete.es', getIdToken: async () => 'e2e-token' } as unknown as User;
const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
const base = { userId: 'e2e-user', activeCases: 0, lastCaseDate: null, status: 'active' } as unknown as ClientDoc;
const CLIENTS: ClientDoc[] = [
  { ...base, id: 'c1', name: 'Jorge López', email: 'jorge@x.es', dataRequest: { id: 'r1', status: 'enviada', expiresAt: future, updatedAt: future } },
  { ...base, id: 'c2', name: 'Juan Pérez', email: 'juan@x.es', dataRequest: { id: 'r2', status: 'completada', updatedAt: future } },
  { ...base, id: 'c3', name: 'Sin Email' },
  { ...base, id: 'c4', name: 'Eva Ruiz', email: 'eva@x.es' },
];

export default function Harness() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-end">
      <ul id="log" className="p-4 text-text">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <ClientsBulkBar
        user={user}
        selected={CLIENTS}
        casesByClient={{ c2: 1 }}
        requestableDocs={REQUESTABLE_DOCS.filter(d => d.id === 'nda_generico')}
        onClear={() => setLog(l => [...l, 'clear'])}
        onRequest={(id, r) => setLog(l => [...l, `request ${id} ${r.status}`])}
        onStatus={(ids, s) => setLog(l => [...l, `status ${ids.join(',')} ${s}`])}
        onDeleted={ids => setLog(l => [...l, `deleted ${ids.join(',')}`])}
      />
    </div>
  );
}
