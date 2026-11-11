'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCases, getClients, type CaseDoc, type ClientDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import KPICard from '@/components/dashboard/KPICard';
import CasesChart from '@/components/dashboard/CasesChart';
import StatusDonut from '@/components/dashboard/StatusDonut';
import DeadlineList from '@/components/dashboard/DeadlineList';
import ClientTable from '@/components/dashboard/ClientTable';
import { canUseDocusign } from '@/lib/docusign/config';
import { watchSignatureStatuses } from '@/lib/signatures/client';
import { isActiveStatus } from '@/lib/signatures/types';
import { canUseContracts } from '@/lib/contracts/config';
import { watchContracts } from '@/lib/contracts/client';
import type { Contract } from '@/lib/contracts/types';

export default function PanelPage() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();

  // Phase 5c: documents waiting for a signature (latest request per document, live).
  const docusignOn = canUseDocusign(userDoc.plan, user);
  const [awaitingSignature, setAwaitingSignature] = useState<number | null>(null);
  useEffect(() => {
    if (!docusignOn || !user) return;
    return watchSignatureStatuses(user.uid, m => {
      let n = 0;
      m.forEach(s => { if (isActiveStatus(s.status)) n++; });
      setAwaitingSignature(n);
    });
  }, [docusignOn, user]);

  // F3: contract dates join "Próximos vencimientos" (live).
  const contractsOn = canUseContracts(userDoc.plan, user);
  const [contracts, setContracts] = useState<Contract[]>([]);
  useEffect(() => {
    if (!contractsOn || !user) return;
    return watchContracts(user.uid, setContracts);
  }, [contractsOn, user]);

  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Guard: Abogados only
  useEffect(() => {
    if (userDoc.plan !== 'Abogados') {
      router.replace('/agent');
    }
  }, [userDoc.plan, router]);

  useEffect(() => {
    if (!userDoc.uid || userDoc.plan !== 'Abogados') return;
    Promise.all([getCases(userDoc.uid), getClients(userDoc.uid)])
      .then(([c, cl]) => { setCases(c); setClients(cl); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userDoc.uid, userDoc.plan]);

  if (userDoc.plan !== 'Abogados') return null;

  const activeCases   = cases.filter(c => c.status === 'active').length;
  const urgentCases   = cases.filter(c => c.status === 'urgent').length;
  const closedCases   = cases.filter(c => c.status === 'closed').length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  const activeCasesByClientId = cases.reduce<Record<string, number>>((acc, c) => {
    if (c.clientId && (c.status === 'active' || c.status === 'urgent')) {
      acc[c.clientId] = (acc[c.clientId] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Panel"
        subtitle={`Bienvenido, ${userDoc.displayName?.split(' ')[0] ?? ''}`}
        actions={
          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-text-on-accent text-caption font-sans font-medium hover:bg-accent-hover transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo caso
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* KPI row */}
            <div className={`grid grid-cols-2 gap-4 ${docusignOn ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              <KPICard label="Casos totales" value={cases.length} />
              <KPICard label="Activos" value={activeCases} accent />
              <KPICard label="Urgentes" value={urgentCases} />
              <KPICard label="Clientes activos" value={activeClients} />
              {docusignOn && (
                <Link href="/documents?view=firma" title="Ver documentos pendientes de firma"
                  className="rounded-xl transition-opacity hover:opacity-80 col-span-2 lg:col-span-1">
                  <KPICard label="Esperando firma" value={awaitingSignature ?? '—'} />
                </Link>
              )}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CasesChart cases={cases} />
              <StatusDonut cases={cases} />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DeadlineList cases={cases} contracts={contracts} />
              <ClientTable clients={clients} activeCasesByClientId={activeCasesByClientId} />
            </div>

            {cases.length === 0 && !loading && (
              <div className="text-center py-12 bg-surface border border-border rounded-xl">
                <p className="text-small text-text-muted mb-4">
                  Aún no tienes casos. Empieza creando el primero.
                </p>
                <Link
                  href="/cases/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-text-on-accent text-small font-sans font-medium hover:bg-accent-hover transition-colors"
                >
                  Crear primer caso
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
