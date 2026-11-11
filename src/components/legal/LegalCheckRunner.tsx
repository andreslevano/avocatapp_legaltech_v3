'use client';

// Checks 1 / several / all NDAs (F2 step 2): one request per NDA, sequentially, with live progress.
// Results open in NdaCheckSheet. Closing the modal stops after the NDA in progress.

import { useEffect, useRef, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { runCheck, type NdaCheckResult } from '@/lib/legal/check-client';
import { VERDICT_LABEL } from '@/lib/legal/check';
import NdaCheckSheet, { VERDICT_ICON, VERDICT_STYLE } from './NdaCheckSheet';

export interface CheckTarget { contractId: string; title: string }

type Row = { t: CheckTarget; state: 'pending' | 'running' | 'done' | 'error'; check?: NdaCheckResult; error?: string };

export default function LegalCheckRunner({ targets, onClose }: { targets: CheckTarget[]; onClose: () => void }) {
  const { user } = useAppAuth();
  const [rows, setRows] = useState<Row[]>(() => targets.map(t => ({ t, state: 'pending' })));
  const [open, setOpen] = useState<NdaCheckResult | null>(null);
  const stopped = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    // Once per opening (React dev mode mounts effects twice; checks cost an AI call each).
    if (!user || started.current) return;
    started.current = true;
    (async () => {
      for (let i = 0; i < targets.length; i++) {
        if (stopped.current) break;
        setRows(rs => rs.map((r, j) => (j === i ? { ...r, state: 'running' } : r)));
        try {
          const check = await runCheck(user, targets[i].contractId);
          setRows(rs => rs.map((r, j) => (j === i ? { ...r, state: 'done', check } : r)));
          if (targets.length === 1 && !stopped.current) setOpen(check);
        } catch (e) {
          const msg = (e as Error).message;
          setRows(rs => rs.map((r, j) => (j === i ? { ...r, state: 'error', error: msg } : r)));
          if (/límite/i.test(msg)) break;
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per opening
  }, [user]);

  const done = rows.filter(r => r.state === 'done' || r.state === 'error').length;
  const count = (v: string) => rows.filter(r => r.check?.verdict === v).length;
  const finished = done === rows.length;

  if (open) return <NdaCheckSheet check={open} onClose={() => (targets.length === 1 ? onClose() : setOpen(null))} />;

  return (
    <ModalShell title="Revisar cambios legales" onClose={() => { stopped.current = true; onClose(); }} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-3 text-[12px] font-sans">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#6b6050]">
            <span>{done} de {rows.length} {rows.length === 1 ? 'NDA revisado' : 'NDAs revisados'}</span>
            <span>{count('ok')} vigentes · {count('review')} a revisar · {count('outdated')} desactualizados</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#161410] overflow-hidden">
            <div className="h-full bg-avocat-gold transition-all" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
          </div>
        </div>
        <ul className="space-y-1">
          {rows.map(r => (
            <li key={r.t.contractId} className="flex items-center justify-between gap-2 rounded-lg border border-[#2e2b20] px-3 py-2">
              <span className="truncate text-[#c8c0ac]" title={r.t.title}>{r.t.title}</span>
              {r.state === 'pending' && <span className="text-[10px] text-[#3a3630] flex-shrink-0">En cola</span>}
              {r.state === 'running' && <span className="text-[10px] text-avocat-gold flex-shrink-0">Revisando…</span>}
              {r.state === 'error' && <span className="text-[10px] text-red-400 flex-shrink-0 max-w-[50%] truncate" title={r.error}>{r.error}</span>}
              {r.state === 'done' && r.check && (
                <button onClick={() => setOpen(r.check!)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-medium flex-shrink-0 hover:opacity-80 ${VERDICT_STYLE[r.check.verdict]}`}>
                  {VERDICT_ICON[r.check.verdict]} {VERDICT_LABEL[r.check.verdict]}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[#3a3630]">Herramienta de asistencia: no sustituye la revisión de un profesional. Pulsa un resultado para ver el detalle.</p>
        <Button variant="ghost" size="sm" fullWidth onClick={() => { stopped.current = true; onClose(); }}>
          {finished ? 'Cerrar' : 'Detener y cerrar'}
        </Button>
      </div>
    </ModalShell>
  );
}
