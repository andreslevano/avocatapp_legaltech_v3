'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import ClientDetailDrawer from '@/components/clients/ClientDetailDrawer';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import type { DocumentRecord } from '@/lib/storage-client';

const client = {
  id: 'c1', userId: 'u', name: 'Juan Pérez', email: 'juan@x.es', phone: '+34 600 000 000', idType: 'DNI', idNumber: '12345678Z',
  address: 'Calle Mayor 1, Madrid', status: 'active', activeCases: 0, lastCaseDate: null,
  dataRequest: { id: 'r1', status: 'completada', documents: ['nda_generico'], updatedAt: '2026-11-16' },
} as unknown as ClientDoc;
const cases = [{ id: 'k1', userId: 'u', title: 'Reclamación ACME', clientId: 'c1', status: 'active' }] as unknown as CaseDoc[];
const doc = (id: string, name: string, o: object = {}) => ({
  id, userId: 'u', name, type: 'pdf', size: 1000, storagePath: '', downloadUrl: '/e2e-files/sample.pdf', caseId: null, clientId: null,
  createdAt: { seconds: 1_794_800_000 }, ...o,
}) as unknown as DocumentRecord;
const docs = [
  doc('d1', 'NDA_Juan.pdf', { clientId: 'c1', signatureStatus: 'completed' }),
  doc('d2', 'Contrato_Juan.pdf', { caseId: 'k1', manualSignature: { sentAt: '2026-11-16' } }),
  doc('d5', 'NDA_devuelto.pdf', { clientId: 'c1', manualSignature: { sentAt: '2026-11-15', returnedDocumentId: 'd6' }, status: 'Firmado' }),
  doc('d3', 'Notas.pdf', { clientId: 'c1', status: 'Borrador' }),
  doc('d4', 'Otro_cliente.pdf', { clientId: 'c9' }),
];

export default function Harness() {
  const [open, setOpen] = useState(true);
  const user = { uid: 'u', email: 'ana@bufete.es', getIdToken: async () => 't' } as unknown as User;
  return (
    <AppAuthProvider user={user} userDoc={{ uid: 'u', plan: 'Abogados' } as unknown as UserDoc}>
    <div className="min-h-screen bg-bg p-6">
      {open ? <ClientDetailDrawer client={client} cases={cases} documents={docs} onEdit={() => setOpen(false)} onClose={() => setOpen(false)} />
        : <p id="closed" className="text-text">cerrado</p>}
    </div>
    </AppAuthProvider>
  );
}
