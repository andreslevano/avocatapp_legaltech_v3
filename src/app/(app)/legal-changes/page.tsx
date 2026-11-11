'use client';

// /legal-changes — what the NDA check uses (F2): approved legal changes + key current law, and
// "Revisar todos mis NDAs" (every confirmed, open NDA), with the latest result per NDA.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { canUseContracts } from '@/lib/contracts/config';
import { watchContracts } from '@/lib/contracts/client';
import { formatContractDate } from '@/lib/contracts/dates';
import { OPEN_LIFECYCLES, type Contract } from '@/lib/contracts/types';
import { watchChanges } from '@/lib/legal/client';
import { getNdaCheck, type NdaCheckResult } from '@/lib/legal/check-client';
import { DEFAULT_BASELINE, type BaselineItem } from '@/lib/legal/baseline';
import { VERDICT_LABEL, type CheckVerdict } from '@/lib/legal/check';
import { SEVERITY_LABEL, type LegalChange } from '@/lib/legal/types';
import LegalCheckRunner, { type CheckTarget } from '@/components/legal/LegalCheckRunner';
import NdaCheckSheet, { VERDICT_ICON, VERDICT_STYLE } from '@/components/legal/NdaCheckSheet';

export default function LegalChangesPage() {
  const { user, userDoc } = useAppAuth();
  const enabled = canUseContracts(userDoc.plan, user);
  const [changes, setChanges] = useState<LegalChange[]>([]);
  const [baseline, setBaseline] = useState<BaselineItem[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [targets, setTargets] = useState<CheckTarget[] | null>(null);
  const [result, setResult] = useState<NdaCheckResult | null>(null);

  useEffect(() => {
    if (!enabled || !user || !db) return;
    const offs = [
      watchChanges('approved', setChanges),
      watchContracts(user.uid, setContracts),
      onSnapshot(collection(db, 'legal_baseline'),
        s => setBaseline(s.empty ? DEFAULT_BASELINE : s.docs.map(d => ({ id: d.id, ...d.data() } as BaselineItem)).filter(b => b.active)),
        () => setBaseline(DEFAULT_BASELINE)),
    ];
    return () => offs.forEach(off => off());
  }, [enabled, user]);

  const ndas = useMemo(() => contracts.filter(c => c.type === 'nda' && c.confirmedByUser && OPEN_LIFECYCLES.includes(c.lifecycle)), [contracts]);
  const unconfirmed = contracts.filter(c => !c.confirmedByUser).length;
  const count = (v: CheckVerdict) => ndas.filter(c => c.legal?.verdict === v).length;

  if (!enabled) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Cambios legales" />
        <p className="p-6 text-small text-text-muted">No disponible en tu plan.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Cambios legales" subtitle="Revisa tus NDAs frente a los cambios normativos" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          <section className="bg-surface border border-border rounded-xl px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-small text-text-heading">Mis NDAs</p>
                <p className="text-caption text-text-muted">
                  {ndas.length} {ndas.length === 1 ? 'NDA vigente con datos confirmados' : 'NDAs vigentes con datos confirmados'}
                  {' '}· {count('ok')} vigentes · {count('review')} a revisar · {count('outdated')} desactualizados
                </p>
              </div>
              <Button variant="accent" size="sm" disabled={!ndas.length}
                onClick={() => setTargets(ndas.map(c => ({ contractId: c.id, title: c.title })))}>
                Revisar todos mis NDAs
              </Button>
            </div>
            {unconfirmed > 0 && (
              <p className="text-caption text-warning-text">
                {unconfirmed} {unconfirmed === 1 ? 'contrato tiene' : 'contratos tienen'} datos sin confirmar y no se revisarán.{' '}
                <Link href="/documents?view=contratos" className="underline">Confírmalos en Documentos</Link>.
              </p>
            )}
            {ndas.length > 0 && (
              <ul className="divide-y divide-border">
                {ndas.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate text-caption text-text" title={c.title}>{c.title}</span>
                    {c.legal?.verdict && c.legal.lastCheckId ? (
                      <button onClick={() => getNdaCheck(c.legal!.lastCheckId!).then(r => r && setResult(r)).catch(() => {})}
                        title={`Revisado el ${formatContractDate(c.legal.checkedAt?.slice(0, 10))}`}
                        className={`px-2 py-0.5 rounded border text-caption font-medium flex-shrink-0 hover:opacity-80 ${VERDICT_STYLE[c.legal.verdict as CheckVerdict]}`}>
                        {VERDICT_ICON[c.legal.verdict as CheckVerdict]} {VERDICT_LABEL[c.legal.verdict as CheckVerdict]}
                      </button>
                    ) : c.legal?.flaggedByChangeIds?.length ? (
                      <span className="text-caption text-info-text flex-shrink-0">Afectado por un cambio · sin revisar</span>
                    ) : (
                      <span className="text-caption text-text-muted flex-shrink-0">Sin revisar</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-label font-semibold uppercase tracking-widest text-text-muted">Cambios legales aprobados</p>
            {changes.length === 0 ? (
              <p className="text-caption text-text-muted">Aún no hay cambios aprobados. Te avisaremos cuando un cambio afecte a tus NDAs.</p>
            ) : changes.map(ch => (
              <div key={ch.id} className="bg-surface border border-border rounded-xl px-4 py-3 space-y-1">
                <p className="text-caption text-text-muted">{ch.jurisdiction === 'EU' ? 'UE' : 'España'} · {SEVERITY_LABEL[ch.severity]} · en vigor {formatContractDate(ch.effectiveFrom ?? ch.publishedAt)}</p>
                <p className="text-small text-text-heading leading-snug">{ch.url ? <a href={ch.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{ch.title} ↗</a> : ch.title}</p>
                <p className="text-caption text-text">{ch.requirement}</p>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-label font-semibold uppercase tracking-widest text-text-muted">Requisitos legales vigentes que también se revisan</p>
            {(baseline ?? []).map(b => (
              <div key={b.id} className="bg-surface border border-border rounded-xl px-4 py-3 space-y-1">
                <p className="text-caption text-text-muted">
                  {b.jurisdiction === 'EU' ? 'UE' : 'España'} · {SEVERITY_LABEL[b.severity]}
                  {!b.validatedByLawyer && <span className="text-warning-text"> · pendiente de validación por un abogado</span>}
                </p>
                <p className="text-caption text-text-heading leading-snug">{b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{b.title} ↗</a> : b.title}</p>
                <p className="text-caption text-text">{b.requirement}</p>
              </div>
            ))}
          </section>

          <p className="text-caption text-text-muted">
            Cubre de momento NDAs sujetos a ley española o de la UE. Herramienta de asistencia: no sustituye la revisión de un profesional.
          </p>
        </div>
      </div>

      {targets && <LegalCheckRunner targets={targets} onClose={() => setTargets(null)} />}
      {result && <NdaCheckSheet check={result} onClose={() => setResult(null)} onRecheck={() => { const r = result; setResult(null); setTargets([{ contractId: r.contractId, title: r.title }]); }} />}
    </div>
  );
}
