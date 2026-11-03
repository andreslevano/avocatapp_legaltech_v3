'use client';

// OneDrive / SharePoint import jobs (F1) — app-wide runner. Lives in the app shell, so an import keeps
// going while the user navigates. Each step is one request (POST …/jobs/[id]/next, one file). If the
// tab is closed, the job stays in Firestore and this provider offers "Reanudar" next time.
// Shows a progress pill (bottom-left) and, when the job asked for it, the contract confirmation queue.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocumentsWorkspace } from '@/contexts/DocumentsWorkspaceContext';
import { canUseMicrosoft } from '@/lib/integrations/microsoft/config';
import { importJobAction, nextImportJobItem, startMicrosoftConnect, type ImportJobCounts } from '@/lib/integrations/microsoft/client';
import { canUseContracts } from '@/lib/contracts/config';
import { analyzeAsContract } from '@/lib/contracts/client';
import type { Contract } from '@/lib/contracts/types';
import type { DocumentRecord } from '@/lib/storage-client';
import ContractConfirmSheet from '@/components/contracts/ContractConfirmSheet';

export interface LiveImportJob {
  id: string;
  status: 'running' | 'done' | 'cancelled' | 'paused';
  pausedReason?: 'reconnect' | null;
  analyze: boolean;
  counts: ImportJobCounts;
  items: { name: string; status: string; error?: string | null; documentId?: string | null }[];
  updatedAt: string;
  finishedAt?: string | null;
}

interface Ctx {
  jobs: LiveImportJob[];
  runningHere: Set<string>;
  startJob: (jobId: string, opts?: { analyze?: boolean }) => void;
}

const ImportJobsCtx = createContext<Ctx | null>(null);
export const useImportJobs = () => useContext(ImportJobsCtx);

const STALE_MS = 2.5 * 60 * 1000;   // a running job not updated for this long was interrupted

export function ImportJobsProvider({ children }: { children: ReactNode }) {
  const { user, userDoc } = useAppAuth();
  const ws = useDocumentsWorkspace();
  const pathname = usePathname();
  const enabled = canUseMicrosoft(userDoc.plan, user?.email);
  const contractsOn = canUseContracts(userDoc.plan, user?.email);
  const [jobs, setJobs] = useState<LiveImportJob[]>([]);
  const [runningHere, setRunningHere] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<Contract[]>([]);
  const [analyzing, setAnalyzing] = useState<{ done: number; total: number } | null>(null);
  const mountedAt = useRef(new Date().toISOString());
  const loops = useRef(new Set<string>());
  const jobsRef = useRef<LiveImportJob[]>([]);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);

  useEffect(() => {
    if (!enabled || !user || !db) return;
    return onSnapshot(
      query(collection(db, 'import_jobs'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(5)),
      s => setJobs(s.docs.map(d => ({ id: d.id, ...d.data() } as LiveImportJob))),
      () => setJobs([]),
    );
  }, [enabled, user]);

  const analyzeDocs = useCallback(async (docIds: string[]) => {
    if (!user || !contractsOn || !docIds.length) return;
    setAnalyzing({ done: 0, total: docIds.length });
    const found: Contract[] = [];
    for (const [i, id] of docIds.entries()) {
      try { found.push(await analyzeAsContract(user, id)); } catch { /* skipped; can be analysed from its panel */ }
      setAnalyzing({ done: i + 1, total: docIds.length });
    }
    setAnalyzing(null);
    setQueue(q => [...q, ...found]);
  }, [user, contractsOn]);

  const startJob = useCallback((jobId: string, opts?: { analyze?: boolean }) => {
    if (!user || loops.current.has(jobId)) return;
    loops.current.add(jobId);
    setRunningHere(s => new Set(s).add(jobId));
    (async () => {
      const imported: string[] = [];
      let analyze = false;
      try {
        for (let guard = 0; guard < 1000; guard++) {
          const r = await nextImportJobItem(user, jobId);
          if (r.document) {
            imported.push(r.document.id);
            ws.setDocs(prev => [r.document as unknown as DocumentRecord, ...prev.filter(d => d.id !== r.document!.id)]);
          }
          if (r.status !== 'running' || !r.item) break;   // finished, cancelled, paused, or the rest is leased elsewhere
        }
        analyze = opts?.analyze ?? !!jobsRef.current.find(j => j.id === jobId)?.analyze;
      } catch (e) {
        ws.notify({ kind: 'error', text: (e as Error).message || 'La importación se detuvo.' });
      } finally {
        loops.current.delete(jobId);
        setRunningHere(s => { const n = new Set(s); n.delete(jobId); return n; });
        // New folders were created server-side: refresh the tree (and the list) once.
        await ws.reload().catch(() => {});
        if (analyze) await analyzeDocs(imported);
      }
    })();
  }, [user, ws, analyzeDocs]);

  const visible = useMemo(() => jobs.filter(j => !dismissed.has(j.id) && (
    runningHere.has(j.id)
    || j.status === 'running' || j.status === 'paused'
    || ((j.status === 'done' || j.status === 'cancelled') && (j.finishedAt ?? j.updatedAt) > mountedAt.current)
  )), [jobs, dismissed, runningHere]);

  const value = useMemo(() => ({ jobs, runningHere, startJob }), [jobs, runningHere, startJob]);

  return (
    <ImportJobsCtx.Provider value={value}>
      {children}
      {visible.length > 0 && (
        <div className="fixed z-[55] left-3 md:left-20 bottom-20 md:bottom-4 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-24px)]">
          {visible.map(j => (
            <JobPill key={j.id} job={j} here={runningHere.has(j.id)}
              onResume={async () => { if (j.status === 'paused') await importJobAction(user!, j.id, 'resume').catch(() => {}); startJob(j.id); }}
              onReconnect={() => startMicrosoftConnect(user!, { returnTo: pathname ?? '/documents', intent: 'connect' })}
              onCancel={() => importJobAction(user!, j.id, 'cancel').catch(() => {})}
              onRetry={async () => { await importJobAction(user!, j.id, 'retry_failed').catch(() => {}); startJob(j.id); }}
              onDismiss={() => setDismissed(s => new Set(s).add(j.id))} />
          ))}
        </div>
      )}
      {analyzing && (
        <div className="fixed z-[55] left-3 md:left-20 bottom-4 md:bottom-4 bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-3 py-2 text-[12px] text-[#c8c0ac] shadow-lg">
          Analizando contratos importados… {analyzing.done} de {analyzing.total}
        </div>
      )}
      {queue.length > 0 && <ContractConfirmSheet contract={queue[0]} onClose={() => setQueue(q => q.slice(1))} />}
    </ImportJobsCtx.Provider>
  );
}

function JobPill({ job: j, here, onResume, onReconnect, onCancel, onRetry, onDismiss }: {
  job: LiveImportJob; here: boolean;
  onResume: () => void; onReconnect: () => void; onCancel: () => void; onRetry: () => void; onDismiss: () => void;
}) {
  const c = j.counts ?? { total: 0, done: 0, error: 0, skipped: 0, pending: 0 };
  const processed = c.done + c.error + c.skipped;
  const stale = j.status === 'running' && !here && Date.now() - Date.parse(j.updatedAt) > STALE_MS;
  const finished = j.status === 'done' || j.status === 'cancelled';
  const pct = c.total ? Math.round((processed / c.total) * 100) : 0;
  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-3 py-2.5 shadow-lg space-y-1.5" role="status">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[#e8d4a0] truncate">
          {finished
            ? `${c.done} ${c.done === 1 ? 'archivo importado' : 'archivos importados'}${c.error ? ` · ${c.error} con error` : ''}${j.status === 'cancelled' ? ' · detenida' : ''}`
            : j.status === 'paused' ? 'Importación en pausa: reconecta Microsoft'
            : stale ? `Importación interrumpida · ${c.pending} pendientes`
            : `Importando de Microsoft… ${processed} de ${c.total}`}
        </p>
        {finished && <button onClick={onDismiss} aria-label="Cerrar" className="text-[#6b6050] hover:text-[#c8c0ac] text-[14px] leading-none">×</button>}
      </div>
      {!finished && (
        <div className="h-1 rounded-full bg-[#161410] overflow-hidden">
          <div className="h-full bg-avocat-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {j.status === 'paused' && <button onClick={onReconnect} className="text-avocat-gold hover:underline">Reconectar</button>}
        {(j.status === 'paused' || stale) && <button onClick={onResume} className="text-avocat-gold hover:underline">Reanudar</button>}
        {j.status === 'running' && !stale && <button onClick={onCancel} className="text-[#8a7f68] hover:text-red-400">Detener</button>}
        {finished && c.error > 0 && <button onClick={onRetry} className="text-avocat-gold hover:underline">Reintentar errores</button>}
        {finished && c.done > 0 && <a href="/documents" className="text-avocat-gold hover:underline">Ver en Documentos</a>}
      </div>
    </div>
  );
}
