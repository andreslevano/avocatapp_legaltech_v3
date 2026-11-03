'use client';

// Import options + progress (F1 stages 3–4, files). After the File Picker: shows what will be
// imported (size, source, problems, earlier copies), destination, links and "Analizar como contrato";
// then copies the files one by one (one request each) with per-file progress and retry.
// Folders arrive in the next step: for now the user opens them in the picker and picks the files.

import { useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import ContractConfirmSheet from '@/components/contracts/ContractConfirmSheet';
import { formatBytes, type DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import { importMicrosoftFile, previewMicrosoftImport, type ImportPreviewRow } from '@/lib/integrations/microsoft/client';
import { CHECK_LABEL, CONTRACT_NAME_RE } from '@/lib/integrations/microsoft/import';
import { canUseContracts } from '@/lib/contracts/config';
import { analyzeAsContract } from '@/lib/contracts/client';
import type { Contract } from '@/lib/contracts/types';

type RowState = 'ready' | 'skip' | 'running' | 'done' | 'error';
interface Row extends ImportPreviewRow { state: RowState; copy: boolean; error?: string; doc?: DocumentRecord }

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
  onImported: (docs: DocumentRecord[]) => void;
}

export default function ImportOptionsSheet({ items, folderId, folderLabel, caseId: initialCase, cases, clients, onBack, onClose, onImported }: Props) {
  const { user, userDoc } = useAppAuth();
  const contractsOn = canUseContracts(userDoc.plan, user?.email);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [caseId, setCaseId] = useState(initialCase ?? '');
  const [clientId, setClientId] = useState('');
  const [analyze, setAnalyze] = useState(false);
  const [phase, setPhase] = useState<'options' | 'importing' | 'analyzing' | 'done'>('options');
  const [analyzed, setAnalyzed] = useState(0);
  const [queue, setQueue] = useState<Contract[]>([]);
  const [analysisErrors, setAnalysisErrors] = useState(0);

  useEffect(() => {
    if (!user) return;
    previewMicrosoftImport(user, items)
      .then(r => {
        setRows(r.map(x => ({ ...x, state: x.check === 'ok' ? (x.duplicates.length ? 'skip' : 'ready') : 'skip', copy: false })));
        setAnalyze(contractsOn && r.some(x => x.check === 'ok' && CONTRACT_NAME_RE.test(x.name)));
      })
      .catch(e => setLoadError((e as Error).message));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per selection
  }, []);

  const importable = useMemo(() => (rows ?? []).filter(r => r.check === 'ok' && (r.duplicates.length === 0 || r.copy)), [rows]);
  const done = (rows ?? []).filter(r => r.state === 'done');
  const failed = (rows ?? []).filter(r => r.state === 'error');

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows(rs => rs!.map(r => (`${r.driveId}:${r.itemId}` === key ? { ...r, ...patch } : r)));

  const runOne = async (r: Row): Promise<DocumentRecord | null> => {
    const key = `${r.driveId}:${r.itemId}`;
    setRow(key, { state: 'running', error: undefined });
    try {
      const doc = await importMicrosoftFile(user!, { driveId: r.driveId, itemId: r.itemId, folderId: folderId ?? null, caseId: caseId || null, clientId: clientId || null }) as unknown as DocumentRecord;
      setRow(key, { state: 'done', doc });
      return doc;
    } catch (e) {
      setRow(key, { state: 'error', error: (e as Error).message });
      return null;
    }
  };

  const analyzeAll = async (docs: DocumentRecord[]) => {
    if (!analyze || !docs.length) { setPhase('done'); return; }
    setPhase('analyzing');
    const found: Contract[] = [];
    let errors = 0;
    for (const [i, d] of docs.entries()) {
      try { found.push(await analyzeAsContract(user!, d.id)); } catch { errors++; }
      setAnalyzed(i + 1);
    }
    setAnalysisErrors(errors);
    setQueue(found);
    setPhase('done');
  };

  const start = async () => {
    if (!user || !rows) return;
    setPhase('importing');
    const imported: DocumentRecord[] = [];
    for (const r of importable) {
      const doc = await runOne(r);
      if (doc) imported.push(doc);
    }
    if (imported.length) onImported(imported);
    await analyzeAll(imported);
  };

  const retry = async (r: Row) => {
    const doc = await runOne(r);
    if (doc) onImported([doc]);
  };

  // Contract confirmation queue (one by one, skippable).
  if (queue.length) {
    return (
      <ContractConfirmSheet contract={queue[0]} onClose={() => setQueue(q => q.slice(1))} />
    );
  }

  const title = phase === 'options' ? 'Importar desde Microsoft' : phase === 'done' ? 'Importación terminada' : 'Importando…';
  return (
    <ModalShell title={title} onClose={phase === 'importing' || phase === 'analyzing' ? () => {} : onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-3 text-[12px] font-sans">
        {loadError && <p className="text-red-400">{loadError}</p>}
        {!rows && !loadError && <p className="text-[#6b6050]">Comprobando los archivos…</p>}

        {rows && (
          <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {rows.map(r => {
              const key = `${r.driveId}:${r.itemId}`;
              return (
                <li key={key} className="rounded-lg border border-[#2e2b20] px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0">{r.check === 'folder' ? '📁' : '📄'}</span>
                    <span className="truncate flex-1 text-[#c8c0ac]" title={r.name}>{r.name}</span>
                    <span className="text-[10px] text-[#6b6050] flex-shrink-0">{r.check === 'ok' ? formatBytes(r.size) : ''}</span>
                    {r.state === 'running' && <span className="text-[10px] text-avocat-gold flex-shrink-0">Importando…</span>}
                    {r.state === 'done' && <span className="text-[10px] text-emerald-400 flex-shrink-0">✓ Importado</span>}
                    {r.state === 'error' && phase !== 'importing' && (
                      <button onClick={() => retry(r)} className="text-[10px] text-avocat-gold hover:underline flex-shrink-0">Reintentar</button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6b6050] truncate">
                    {SOURCE_LABEL[r.provider]}{r.path ? ` · ${r.path}` : ''}
                  </p>
                  {r.check !== 'ok' && <p className="text-[11px] text-amber-400">{CHECK_LABEL[r.check]}</p>}
                  {r.state === 'error' && <p className="text-[11px] text-red-400">{r.error}</p>}
                  {r.check === 'ok' && r.duplicates.length > 0 && phase === 'options' && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-amber-400">Ya importado como «{r.duplicates[0].name}».</span>
                      <label className="flex items-center gap-1 text-[#c8c0ac]">
                        <input type="checkbox" className="accent-avocat-gold" checked={r.copy}
                          onChange={e => setRow(key, { copy: e.target.checked, state: e.target.checked ? 'ready' : 'skip' })} />
                        Importar otra copia
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {rows && phase === 'options' && (
          <>
            <div className="space-y-2">
              <p className="text-[11px] text-[#6b6050]">Destino: <span className="text-[#c8c0ac]">{folderLabel ?? 'Mis documentos'}</span></p>
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
            <div className="flex gap-2 pt-1">
              <Button variant="BtnGold" size="sm" fullWidth disabled={!importable.length} onClick={start}>
                {importable.length ? `Importar ${importable.length} ${importable.length === 1 ? 'archivo' : 'archivos'} →` : 'Nada que importar'}
              </Button>
              <Button variant="BtnGhost" size="sm" onClick={onBack}>Volver al selector</Button>
            </div>
          </>
        )}

        {phase === 'analyzing' && <p className="text-[#c8c0ac]">Analizando contratos… {analyzed} de {done.length}</p>}

        {phase === 'done' && (
          <div className="space-y-2">
            <p className={done.length ? 'text-emerald-400' : 'text-[#c8c0ac]'}>
              {done.length} {done.length === 1 ? 'archivo importado' : 'archivos importados'}{failed.length ? ` · ${failed.length} con error (puedes reintentarlos)` : ''}.
            </p>
            {analysisErrors > 0 && <p className="text-[11px] text-amber-400">{analysisErrors} no se pudieron analizar como contrato; puedes hacerlo desde su panel.</p>}
            <div className="flex gap-2">
              <Button variant="BtnGold" size="sm" fullWidth onClick={onClose}>Ver en Documentos</Button>
              <Button variant="BtnGhost" size="sm" onClick={onBack}>Importar más</Button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
