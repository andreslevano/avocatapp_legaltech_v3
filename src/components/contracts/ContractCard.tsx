'use client';

// Contract summary in the /documents preview panel (F0): live from contracts/{id} by documentId.
// Without a record it offers "Analizar como contrato".

import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { analyzeAsContract, contractAction } from '@/lib/contracts/client';
import { formatContractDate, madridToday, nextContractEvent } from '@/lib/contracts/dates';
import { CONTRACT_TYPE_LABEL, DATE_KIND_LABEL, LIFECYCLE_LABEL, type Contract } from '@/lib/contracts/types';
import { getChanges } from '@/lib/legal/client';
import type { LegalChange } from '@/lib/legal/types';
import { getNdaCheck, type NdaCheckResult } from '@/lib/legal/check-client';
import { VERDICT_LABEL, type CheckVerdict } from '@/lib/legal/check';
import LegalCheckRunner from '@/components/legal/LegalCheckRunner';
import NdaCheckSheet, { VERDICT_ICON, VERDICT_STYLE } from '@/components/legal/NdaCheckSheet';

export const LIFECYCLE_STYLE: Record<string, string> = {
  active: 'text-success-text border-status-a-tiempo-border bg-success-subtle',
  expiring: 'text-warning-text border-status-proximo-border bg-warning-subtle',
  expired: 'text-danger-text border-status-urgente-border bg-danger-subtle',
  renewed: 'text-info-text border-status-en-revision-border bg-info-subtle',
  terminated: 'text-text-muted border-border bg-transparent',
  superseded: 'text-text-muted border-border bg-transparent',
};

/** Formats the analysis can read (Avocat's own .doc, Word, PDF with text, plain text). */
export const ANALYZABLE_TYPES = new Set(['doc', 'docx', 'pdf', 'txt', 'md', 'html', 'htm']);

interface Props {
  documentId: string;
  documentType: string;
  onOpenSheet: (c: Contract) => void;
}

export default function ContractCard({ documentId, documentType, onOpenSheet }: Props) {
  const { user } = useAppAuth();
  const [c, setC] = useState<Contract | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<NdaCheckResult | null>(null);

  useEffect(() => {
    setError('');
    if (!db || !user) return;
    setC(undefined);
    return onSnapshot(
      query(collection(db, 'contracts'), where('userId', '==', user.uid), where('documentId', '==', documentId), limit(1)),
      s => setC(s.empty ? null : ({ id: s.docs[0].id, ...s.docs[0].data() } as Contract)),
      () => setC(null),
    );
  }, [documentId, user]);

  if (c === undefined || !user) return null;

  const analyze = async () => {
    setBusy(true); setError('');
    try {
      onOpenSheet(await analyzeAsContract(user, documentId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (c === null) {
    if (!ANALYZABLE_TYPES.has(documentType.toLowerCase())) return null;
    return (
      <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-bg space-y-2">
        <Button variant="secondary" size="sm" fullWidth loading={busy} onClick={analyze}>
          {busy ? 'Leyendo el contrato…' : 'Analizar como contrato'}
        </Button>
        <p className="text-caption text-text-muted">Extrae partes y fechas para avisarte antes de que venza.</p>
        {error && <p className="text-caption text-danger-text">{error}</p>}
      </div>
    );
  }

  const next = nextContractEvent(c.dates, madridToday());
  const reactivate = async () => {
    setBusy(true);
    try { await contractAction(user, c.id, 'reactivate'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-bg space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-text-muted uppercase tracking-widest font-semibold text-label">Contrato · {CONTRACT_TYPE_LABEL[c.type]}</p>
        <span className={`px-1.5 py-0.5 rounded text-caption font-medium border ${LIFECYCLE_STYLE[c.lifecycle]}`}>
          {c.confirmedByUser ? LIFECYCLE_LABEL[c.lifecycle] : 'Sin confirmar'}
        </span>
      </div>
      {c.parties?.length > 0 && (
        <p className="text-caption text-text truncate" title={c.parties.map(p => p.company || p.name).join(' · ')}>
          {c.parties.map(p => p.company || p.name).join(' · ')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
        <span className="text-text-muted">Inicio</span><span className="text-text text-right">{formatContractDate(c.dates.effectiveDate)}</span>
        <span className="text-text-muted">Fin</span>
        <span className="text-text text-right">{c.term?.indefinite ? 'Indefinido' : formatContractDate(c.dates.termEndDate)}</span>
        {c.dates.noticeDeadline && (<><span className="text-text-muted">Preaviso</span><span className="text-text text-right">{formatContractDate(c.dates.noticeDeadline)}</span></>)}
        {c.dates.confidentialitySurvivalEnd && (<><span className="text-text-muted">Confidencialidad</span><span className="text-text text-right">{formatContractDate(c.dates.confidentialitySurvivalEnd)}</span></>)}
      </div>
      {c.confirmedByUser && next && (
        <p className="text-caption text-text-muted">Próximo aviso: {DATE_KIND_LABEL[next.kind].toLowerCase()} · {formatContractDate(next.date)}</p>
      )}
      {!!c.legal?.flaggedByChangeIds?.length && <LegalFlags ids={c.legal.flaggedByChangeIds} />}
      {c.alertsMuted && (
        <p className="text-caption text-text-muted">
          Avisos desactivados. <button onClick={reactivate} disabled={busy} className="text-accent-text hover:underline">Reactivar</button>
        </p>
      )}
      {c.confirmedByUser && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={() => setChecking(true)}>Revisar cambios legales</Button>
          {c.legal?.verdict && c.legal.lastCheckId && (
            <button title={`Última revisión: ${formatContractDate(c.legal.checkedAt?.slice(0, 10))}`}
              onClick={() => getNdaCheck(c.legal!.lastCheckId!).then(r => r && setResult(r)).catch(() => {})}
              className={`px-2 py-1 rounded border text-caption font-medium flex-shrink-0 hover:opacity-80 ${VERDICT_STYLE[c.legal.verdict as CheckVerdict]}`}>
              {VERDICT_ICON[c.legal.verdict as CheckVerdict]} {VERDICT_LABEL[c.legal.verdict as CheckVerdict]}
            </button>
          )}
        </div>
      )}
      {checking && <LegalCheckRunner targets={[{ contractId: c.id, title: c.title }]} onClose={() => setChecking(false)} />}
      {result && <NdaCheckSheet check={result} onClose={() => setResult(null)} onRecheck={() => { setResult(null); setChecking(true); }} />}
      {c.confirmedByUser ? (
        <button onClick={() => onOpenSheet(c)} className="text-caption text-text-muted hover:text-accent-text transition-colors">Editar datos del contrato</button>
      ) : (
        <Button variant="accent" size="sm" fullWidth onClick={() => onOpenSheet(c)}>Revisar y confirmar</Button>
      )}
      {error && <p className="text-caption text-danger-text">{error}</p>}
    </div>
  );
}

/** F2: approved legal changes that may affect this contract. */
function LegalFlags({ ids }: { ids: string[] }) {
  const [list, setList] = useState<LegalChange[] | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    getChanges(key.split(',')).then(cs => { if (live) setList(cs); }).catch(() => { if (live) setList([]); });
    return () => { live = false; };
  }, [key]);
  if (!list?.length) return null;
  return (
    <div className="rounded-lg border border-status-en-revision-border bg-info-subtle px-2.5 py-2 space-y-1.5">
      <p className="text-caption text-info-text font-medium">Puede verse afectado por {list.length === 1 ? 'un cambio legal' : `${list.length} cambios legales`}</p>
      {list.map(ch => (
        <div key={ch.id} className="text-caption leading-snug">
          <p className="text-text">{ch.requirement}</p>
          <p className="text-caption text-text-muted truncate" title={ch.title}>
            {ch.url ? <a href={ch.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-text">{ch.title} ↗</a> : ch.title}
          </p>
        </div>
      ))}
    </div>
  );
}
