'use client';

// Import options + progress (F1 stages 3–4). After the File Picker: what will be imported (files and
// expanded folders: size, source, problems, earlier copies), destination, "Mantener estructura de
// carpetas", case / client links and "Analizar como contrato". "Importar" creates an import job that
// the app-wide runner (ImportJobsContext) processes one file at a time — closing this sheet or
// navigating doesn't stop it; a progress pill stays visible.

import { useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useImportJobs } from '@/contexts/ImportJobsContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { formatBytes } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import { createImportJob, previewMicrosoftImport, type ImportPreview } from '@/lib/integrations/microsoft/client';
import { CHECK_LABEL, CONTRACT_NAME_RE } from '@/lib/integrations/microsoft/import';
import { canUseContracts } from '@/lib/contracts/config';

const SOURCE_LABEL = { onedrive: 'OneDrive', sharepoint: 'SharePoint' } as const;
const SELECT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[12px] text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40';

interface Props {
  items: { driveId: string; itemId: string }[];
  folderId?: string | null;
  folderLabel?: string;
  caseId?: string | null;
  cases: CaseDoc[];
  clients: ClientDoc[];
  onBack: () => void;
  onClose: () => void;
}

export default function ImportOptionsSheet({ items, folderId, folderLabel, caseId: initialCase, cases, clients, onBack, onClose }: Props) {
  const { user, userDoc } = useAppAuth();
  const runner = useImportJobs();
  const contractsOn = canUseContracts(userDoc.plan, user);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [caseId, setCaseId] = useState(initialCase ?? '');
  const [clientId, setClientId] = useState('');
  const [analyze, setAnalyze] = useState(false);
  const [keepStructure, setKeepStructure] = useState(true);
  const [reimport, setReimport] = useState<Set<string>>(new Set());   // itemIds already imported, chosen again
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    previewMicrosoftImport(user, items)
      .then(p => {
        setPreview(p);
        setAnalyze(contractsOn && p.files.some(f => f.check === 'ok' && CONTRACT_NAME_RE.test(f.name)));
      })
      .catch(e => setLoadError((e as Error).message));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per selection
  }, []);

  const hasFolders = !!preview?.rows.some(r => r.folder);
  const toImport = useMemo(() => (preview?.files ?? [])
    .filter(f => f.check === 'ok' && (!f.duplicateOf || reimport.has(f.itemId))), [preview, reimport]);
  const folderDuplicates = (preview?.files ?? []).filter(f => f.check === 'ok' && f.duplicateOf && f.rel.length > 0);
  const job = jobId ? runner?.jobs.find(j => j.id === jobId) : null;

  const toggleReimport = (ids: string[], on: boolean) => setReimport(prev => {
    const n = new Set(prev);
    ids.forEach(id => (on ? n.add(id) : n.delete(id)));
    return n;
  });

  const start = async () => {
    if (!user || !preview || !runner) return;
    setStarting(true); setError('');
    try {
      const id = await createImportJob(user, {
        destinationFolderId: folderId ?? null, keepStructure: hasFolders && keepStructure,
        caseId: caseId || null, clientId: clientId || null, analyze,
        files: toImport.map(f => ({ driveId: f.driveId, itemId: f.itemId, name: f.name, size: f.size, rel: f.rel })),
        folders: preview.folders,
      });
      setJobId(id);
      runner.startJob(id, { analyze });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  // ── Progress (the job keeps running if the sheet is closed) ──
  if (jobId) {
    const c = job?.counts;
    const processed = c ? c.done + c.error + c.skipped : 0;
    const finished = job && (job.status === 'done' || job.status === 'cancelled');
    return (
      <ModalShell title={finished ? 'Importación terminada' : 'Importando…'} onClose={onClose} sheetOnMobile>
        <div className="space-y-3 text-[12px] font-sans">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#6b6050]">
              <span>{processed} de {c?.total ?? toImport.length}</span>
              <span>✓ {c?.done ?? 0}{c?.error ? ` · ⚠️ ${c.error}` : ''}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#161410] overflow-hidden">
              <div className="h-full bg-avocat-gold transition-all" style={{ width: `${c?.total ? (processed / c.total) * 100 : 0}%` }} />
            </div>
          </div>
          <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
            {(job?.items ?? []).map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px]">
                <span className="truncate flex-1 text-[#c8c0ac]" title={it.name}>{it.name}</span>
                <span className={`flex-shrink-0 ${it.status === 'done' ? 'text-emerald-400' : it.status === 'error' ? 'text-red-400' : it.status === 'running' ? 'text-avocat-gold' : 'text-[#6b6050]'}`}>
                  {it.status === 'done' ? '✓' : it.status === 'error' ? (it.error ?? 'Error') : it.status === 'running' ? 'Importando…' : it.status === 'skipped' ? 'Omitido' : 'En cola'}
                </span>
              </li>
            ))}
          </ul>
          {!finished && <p className="text-[11px] text-[#6b6050]">Puedes cerrar esta ventana o seguir trabajando: la importación continúa y verás el progreso abajo a la izquierda.</p>}
          <Button variant="BtnGold" size="sm" fullWidth onClick={onClose}>{finished ? 'Ver en Documentos' : 'Seguir en segundo plano'}</Button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Importar desde Microsoft" onClose={onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-3 text-[12px] font-sans">
        {loadError && <p className="text-red-400">{loadError}</p>}
        {!preview && !loadError && <p className="text-[#6b6050]">Comprobando los archivos{items.length > 1 ? ' y carpetas' : ''}…</p>}

        {preview && (
          <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {preview.rows.map(r => {
              const dupIds = r.duplicates.length ? [r.itemId] : [];
              return (
                <li key={`${r.driveId}:${r.itemId}`} className="rounded-lg border border-[#2e2b20] px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0">{r.folder ? '📁' : '📄'}</span>
                    <span className="truncate flex-1 text-[#c8c0ac]" title={r.name}>{r.name}</span>
                    <span className="text-[10px] text-[#6b6050] flex-shrink-0">
                      {r.folder ? `${r.folder.files} ${r.folder.files === 1 ? 'archivo' : 'archivos'}` : r.check === 'ok' ? formatBytes(r.size) : ''}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6b6050] truncate">{SOURCE_LABEL[r.provider]}{r.path ? ` · ${r.path}` : ''}</p>
                  {r.folder && (
                    <p className="text-[11px] text-[#c8c0ac]">
                      {r.folder.importable} para importar
                      {r.folder.duplicates ? ` · ${r.folder.duplicates} ya importados` : ''}
                      {r.folder.problems ? ` · ${r.folder.problems} no compatibles o > 25 MB` : ''}
                      {r.folder.truncated && <span className="text-amber-400"> · solo los primeros 300 archivos / 8 niveles</span>}
                    </p>
                  )}
                  {!r.folder && r.check !== 'ok' && <p className="text-[11px] text-amber-400">{CHECK_LABEL[r.check]}</p>}
                  {!r.folder && r.check === 'ok' && dupIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-amber-400">Ya importado como «{r.duplicates[0].name}».</span>
                      <label className="flex items-center gap-1 text-[#c8c0ac]">
                        <input type="checkbox" className="accent-avocat-gold" checked={reimport.has(r.itemId)}
                          onChange={e => toggleReimport(dupIds, e.target.checked)} />
                        Importar otra copia
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {preview && (
          <>
            <div className="space-y-2">
              <p className="text-[11px] text-[#6b6050]">Destino: <span className="text-[#c8c0ac]">{folderLabel ?? 'Mis documentos'}</span></p>
              {hasFolders && (
                <label className="flex items-center gap-2 text-[12px] text-[#c8c0ac]">
                  <input type="checkbox" className="accent-avocat-gold" checked={keepStructure} onChange={e => setKeepStructure(e.target.checked)} />
                  Mantener estructura de carpetas
                </label>
              )}
              {folderDuplicates.length > 0 && (
                <label className="flex items-center gap-2 text-[12px] text-[#c8c0ac]">
                  <input type="checkbox" className="accent-avocat-gold"
                    checked={folderDuplicates.every(f => reimport.has(f.itemId))}
                    onChange={e => toggleReimport(folderDuplicates.map(f => f.itemId), e.target.checked)} />
                  Volver a importar los {folderDuplicates.length} ya importados de las carpetas
                </label>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select className={SELECT} value={caseId} onChange={e => setCaseId(e.target.value)} aria-label="Vincular a caso">
                  <option value="" className="bg-[#161410]">Sin caso</option>
                  {cases.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.title}</option>)}
                </select>
                <select className={SELECT} value={clientId} onChange={e => setClientId(e.target.value)} aria-label="Vincular a cliente">
                  <option value="" className="bg-[#161410]">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.name}</option>)}
                </select>
              </div>
              {contractsOn && (
                <label className="flex items-center gap-2 text-[12px] text-[#c8c0ac]">
                  <input type="checkbox" className="accent-avocat-gold" checked={analyze} onChange={e => setAnalyze(e.target.checked)} />
                  Analizar como contrato después de importar
                </label>
              )}
              <p className="text-[10px] text-[#3a3630]">Avocat guarda una copia. Nunca modifica ni borra nada en OneDrive o SharePoint.</p>
            </div>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="BtnGold" size="sm" fullWidth loading={starting} disabled={!toImport.length || !runner} onClick={start}>
                {toImport.length ? `Importar ${toImport.length} ${toImport.length === 1 ? 'archivo' : 'archivos'} →` : 'Nada que importar'}
              </Button>
              <Button variant="BtnGhost" size="sm" onClick={onBack}>Volver al selector</Button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
