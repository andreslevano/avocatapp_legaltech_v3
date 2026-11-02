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

export const LIFECYCLE_STYLE: Record<string, string> = {
  active: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  expiring: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  expired: 'text-red-400 border-red-400/30 bg-red-400/5',
  renewed: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  terminated: 'text-[#6b6050] border-[#2e2b20] bg-transparent',
  superseded: 'text-[#6b6050] border-[#2e2b20] bg-transparent',
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
      <div className="border-t border-[#2e2b20] px-4 py-3 flex-shrink-0 bg-[#1a1812] space-y-2">
        <Button variant="BtnOutlineDark" size="sm" fullWidth loading={busy} onClick={analyze}>
          {busy ? 'Leyendo el contrato…' : 'Analizar como contrato'}
        </Button>
        <p className="text-[10px] text-[#3a3630]">Extrae partes y fechas para avisarte antes de que venza.</p>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    );
  }

  const next = nextContractEvent(c.dates, madridToday());
  const reactivate = async () => {
    setBusy(true);
    try { await contractAction(user, c.id, 'reactivate'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="border-t border-[#2e2b20] px-4 py-3 flex-shrink-0 bg-[#1a1812] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[#3a3630] uppercase tracking-widest font-semibold text-[9px]">Contrato · {CONTRACT_TYPE_LABEL[c.type]}</p>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${LIFECYCLE_STYLE[c.lifecycle]}`}>
          {c.confirmedByUser ? LIFECYCLE_LABEL[c.lifecycle] : 'Sin confirmar'}
        </span>
      </div>
      {c.parties?.length > 0 && (
        <p className="text-[11px] text-[#c8c0ac] truncate" title={c.parties.map(p => p.company || p.name).join(' · ')}>
          {c.parties.map(p => p.company || p.name).join(' · ')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-[#6b6050]">Inicio</span><span className="text-[#c8c0ac] text-right">{formatContractDate(c.dates.effectiveDate)}</span>
        <span className="text-[#6b6050]">Fin</span>
        <span className="text-[#c8c0ac] text-right">{c.term?.indefinite ? 'Indefinido' : formatContractDate(c.dates.termEndDate)}</span>
        {c.dates.noticeDeadline && (<><span className="text-[#6b6050]">Preaviso</span><span className="text-[#c8c0ac] text-right">{formatContractDate(c.dates.noticeDeadline)}</span></>)}
        {c.dates.confidentialitySurvivalEnd && (<><span className="text-[#6b6050]">Confidencialidad</span><span className="text-[#c8c0ac] text-right">{formatContractDate(c.dates.confidentialitySurvivalEnd)}</span></>)}
      </div>
      {c.confirmedByUser && next && (
        <p className="text-[10px] text-[#6b6050]">Próximo aviso: {DATE_KIND_LABEL[next.kind].toLowerCase()} · {formatContractDate(next.date)}</p>
      )}
      {!!c.legal?.flaggedByChangeIds?.length && <LegalFlags ids={c.legal.flaggedByChangeIds} />}
      {c.alertsMuted && (
        <p className="text-[10px] text-[#6b6050]">
          Avisos desactivados. <button onClick={reactivate} disabled={busy} className="text-avocat-gold hover:underline">Reactivar</button>
        </p>
      )}
      {c.confirmedByUser ? (
        <button onClick={() => onOpenSheet(c)} className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors">Editar datos del contrato</button>
      ) : (
        <Button variant="BtnGold" size="sm" fullWidth onClick={() => onOpenSheet(c)}>Revisar y confirmar</Button>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
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
    <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-2.5 py-2 space-y-1.5">
      <p className="text-[10px] text-sky-400 font-medium">Puede verse afectado por {list.length === 1 ? 'un cambio legal' : `${list.length} cambios legales`}</p>
      {list.map(ch => (
        <div key={ch.id} className="text-[11px] leading-snug">
          <p className="text-[#c8c0ac]">{ch.requirement}</p>
          <p className="text-[10px] text-[#6b6050] truncate" title={ch.title}>
            {ch.url ? <a href={ch.url} target="_blank" rel="noopener noreferrer" className="hover:text-avocat-gold">{ch.title} ↗</a> : ch.title}
          </p>
        </div>
      ))}
    </div>
  );
}
