'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import { AppAuthProvider } from '@/contexts/AppAuthContext';
import PrepareNegotiation from '@/components/negotiations/PrepareNegotiation';
import OwnerNegotiation from '@/components/negotiations/OwnerNegotiation';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { splitClauses } from '@/lib/negotiations/clauses';
import { defaultLevel, MFW_PLAYBOOK } from '@/lib/negotiations/levels';
import type { NegClause, Negotiation } from '@/lib/negotiations/types';

const user = { uid: 'e2e-user', email: 'felix.dia@mobilityforwork.es', emailVerified: true, getIdToken: async () => 'e2e-token' } as unknown as User;
const userDoc = { uid: 'e2e-user', plan: 'Abogados', displayName: 'Félix Dia' } as unknown as UserDoc;

const md = renderMfwNda({ receptor: { tipo: 'sociedad', razonSocial: 'Acme S.L.', nif: 'B12345678', domicilio: 'Calle 2', nombre: 'Juan Pérez', documento: 'DNI 1', cargo: 'CEO', facultades: 'Poder', email: 'juan@acme.es' }, productos: 'Plataforma' });
const split = splitClauses(md, 14);
const AT = '2026-11-19T10:00:00.000Z';

function negotiation(estado: string): Negotiation {
  if (!split.ok) throw new Error(split.error);
  const clauses: NegClause[] = split.clauses.map(c => ({
    key: c.key, n: c.n, heading: c.heading, level: defaultLevel(MFW_PLAYBOOK, c.n), original: c.text, current: c.text,
    state: 'aceptada', proposal: null, ownerDecision: null, comments: [],
  }));
  if (estado === 'cambios') {
    const c1 = clauses[0];
    clauses[0] = { ...c1, state: 'propuesta', proposal: { text: c1.current.replace('cualquier relación', 'la relación comercial'), reason: 'Limitarlo a la relación comercial', at: AT, round: 1 } };
    clauses[3] = { ...clauses[3], state: 'comentada', comments: [{ by: 'tercero', text: '¿Incluye el software de terceros?', at: AT, round: 1 }] };
  }
  if (estado === 'acordado') clauses[4] = { ...clauses[4], current: `${clauses[4].current} Plazo: 15 días.` };
  return {
    id: 'n1', ownerId: 'e2e-user', orgId: null, clientId: 'c1', templateId: MFW_PLAYBOOK.templateId, templateVersion: 'v1',
    ownerCompany: 'MOBIFORWORK S.L.', title: 'NDA MOBIFORWORK Acme', draftDocumentId: 'd1', finalDocumentId: null,
    counterparty: { name: 'Juan Pérez', email: 'juan@acme.es', company: 'Acme S.L.' }, showLevels: true,
    status: estado === 'cambios' ? 'cambios_propuestos' : estado === 'acordado' ? 'acordado' : 'en_revision',
    turn: estado === 'cambios' ? 'propietario' : estado === 'acordado' ? null : 'tercero',
    round: 1, version: estado === 'acordado' ? 2 : 1, tokenHash: 'h', tokenHashes: ['h'], expiresAt: '2099-12-03T10:00:00.000Z',
    lastSentAt: AT, sentCount: 1, openedAt: estado === 'revision' ? null : AT, preamble: split.preamble, tail: split.tail, clauses,
    createdAt: AT, updatedAt: AT,
  };
}

export default function NegotiationHarness() {
  // Read the query after mount: the server render has no URL (no hydration mismatch).
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => setQ(new URLSearchParams(window.location.search)), []);
  if (!q) return null;
  const estado = q.get('estado') ?? 'preparar';
  return (
    <AppAuthProvider user={user} userDoc={userDoc}>
      <div className="min-h-screen bg-bg p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {estado === 'preparar'
            ? <PrepareNegotiation draft={{ documentId: 'd1', markdown: md, title: 'NDA MOBIFORWORK Acme', clientId: 'c1', counterparty: { name: 'Juan Pérez', email: 'juan@acme.es', company: 'Acme S.L.' } }} />
            : <OwnerNegotiation n={negotiation(estado)} focus={q.get('clausula')} />}
        </div>
      </div>
    </AppAuthProvider>
  );
}
