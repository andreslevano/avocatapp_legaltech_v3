'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import SignAndSendSheet from '@/components/signatures/SignAndSendSheet';
import FocusedSigningHost from '@/components/signatures/FocusedSigningHost';

const user = { uid: 'e2e-user', email: 'ana@bufete.es', getIdToken: async () => 'e2e-token' } as unknown as User;
const userDoc = {
  uid: 'e2e-user', plan: 'Abogados',
  integrations: { docusign: { connected: true, status: 'connected', name: 'Ana Abogada', email: 'ana@bufete.es' } },
} as unknown as UserDoc;

export default function SignSheetHarness() {
  const [open, setOpen] = useState(true);
  return (
    <AppAuthProvider user={user} userDoc={userDoc}>
      <div className="min-h-screen bg-bg p-6">
        {open
          ? <SignAndSendSheet documentId="doc-1" title="Contrato de prueba" language="es" returnTo="/documents"
              defaultCounterparty={{ name: 'Juan García', email: 'juan@nike.com' }} onClose={() => setOpen(false)} />
          : <p data-testid="closed" className="text-text">Hoja cerrada</p>}
        <FocusedSigningHost />
      </div>
    </AppAuthProvider>
  );
}
