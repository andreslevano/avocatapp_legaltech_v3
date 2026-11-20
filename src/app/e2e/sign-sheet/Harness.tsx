'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import SignAndSendSheet from '@/components/signatures/SignAndSendSheet';
import FocusedSigningHost from '@/components/signatures/FocusedSigningHost';
import YousignSigningHost from '@/components/signatures/YousignSigningHost';

const user = { uid: 'e2e-user', email: 'ana@bufete.es', getIdToken: async () => 'e2e-token' } as unknown as User;
const userDoc = {
  uid: 'e2e-user', plan: 'Abogados',
  integrations: { docusign: { connected: true, status: 'connected', name: 'Ana Abogada', email: 'ana@bufete.es' } },
} as unknown as UserDoc;

export default function SignSheetHarness() {
  const [open, setOpen] = useState(true);
  // ?metodo=elegir → the "¿Cómo quieres firmar?" step; default → straight to digital (DocuSign tests).
  // &firma=1 → the user has a handwritten signature saved in Perfil.
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const choose = q.get('metodo') === 'elegir';
  const doc = q.get('firma') === '1'
    ? { ...userDoc, signatureUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/firma.png?alt=media' } as unknown as UserDoc
    : userDoc;
  return (
    <AppAuthProvider user={user} userDoc={doc}>
      <div className="min-h-screen bg-bg p-6">
        {open
          ? <SignAndSendSheet documentId="doc-1" title="Contrato de prueba" language="es" returnTo="/documents"
              initialMethod={choose ? undefined : 'digital'}
              defaultCounterparty={{ name: 'Juan García', email: 'juan@nike.com' }} onClose={() => setOpen(false)} />
          : <p data-testid="closed" className="text-text">Hoja cerrada</p>}
        <FocusedSigningHost />
        <YousignSigningHost />
      </div>
    </AppAuthProvider>
  );
}
