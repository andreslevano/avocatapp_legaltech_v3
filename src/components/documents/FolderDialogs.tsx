'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocumentsWorkspace } from '@/contexts/DocumentsWorkspaceContext';
import { createFolder as createFolderDoc, moveDocumentsToFolder } from '@/lib/folders/client';
import {
  childrenOf, folderPathLabel, planAutoOrganize, planFolderDelete, ROOT_LABEL, uniqueName,
} from '@/lib/folders/tree';
import { sanitizeFolderName, type FolderRecord } from '@/lib/folders/types';
import { IconFolder } from './FolderTree';
import { ModalShell } from './modals';
import type { DragPayload } from './workspace';

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

/** Renders whichever folder dialog the workspace has open. Mounted once by /documents. */
export default function FolderDialogs() {
  const { dialog, closeDialog } = useDocumentsWorkspace();
  if (!dialog) return null;
  switch (dialog.type) {
    case 'new-folder':    return <NameDialog mode="new" parentId={dialog.parentId} onClose={closeDialog} />;
    case 'rename-folder': return <NameDialog mode="rename" folder={dialog.folder} parentId={dialog.folder.parentId} onClose={closeDialog} />;
    case 'move':          return <MoveToModal payload={dialog.payload} onClose={closeDialog} />;
    case 'delete-folder': return <DeleteFolderDialog folder={dialog.folder} onClose={closeDialog} />;
    case 'auto-organize': return <AutoOrganizeModal onClose={closeDialog} />;
  }
}

// ── New / rename ─────────────────────────────────────────────────

function NameDialog({ mode, folder, parentId, onClose }: {
  mode: 'new' | 'rename'; folder?: FolderRecord; parentId: string | null; onClose: () => void;
}) {
  const ws = useDocumentsWorkspace();
  const [name, setName] = useState(() => folder?.name ?? uniqueName(ws.folders, parentId, 'Nueva carpeta'));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  const submit = async () => {
    setSaving(true);
    const err = mode === 'new' ? await ws.createFolder(parentId, name) : await ws.renameFolder(folder!.id, name);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  return (
    <ModalShell title={mode === 'new' ? 'Nueva carpeta' : 'Renombrar carpeta'} onClose={onClose}>
      <p className="text-[11px] text-[#6b6050] truncate">En {folderPathLabel(parentId, ws.foldersById)}</p>
      <input
        ref={inputRef}
        className={INPUT}
        value={name}
        maxLength={120}
        onChange={e => { setName(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="BtnGold" size="sm" loading={saving} onClick={submit} disabled={!name.trim()}>
          {mode === 'new' ? 'Crear' : 'Guardar'}
        </Button>
      </div>
    </ModalShell>
  );
}

// ── Move to… (tree picker) ───────────────────────────────────────

function MoveToModal({ payload, onClose }: { payload: DragPayload; onClose: () => void }) {
  const ws = useDocumentsWorkspace();
  const { folders, foldersById } = ws;
  // Folders being moved (and their subtrees) can't be destinations.
  const blocked = useMemo(() => new Set(
    folders.filter(f => payload.folderIds.some(id => f.id === id || f.ancestors.includes(id))).map(f => f.id),
  ), [folders, payload.folderIds]);

  // Current location if every item shares one (marked "actual").
  const current = useMemo(() => {
    const locs = new Set<string | null>([
      ...payload.docIds.map(id => {
        const fid = ws.docs.find(d => d.id === id)?.folderId ?? null;
        return fid && foldersById.has(fid) ? fid : null;
      }),
      ...payload.folderIds.map(id => foldersById.get(id)?.parentId ?? null),
    ]);
    return locs.size === 1 ? [...locs][0] : undefined;
  }, [payload, ws.docs, foldersById]);

  const [target, setTarget] = useState<string | null>(ws.currentFolderId);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const cur = ws.currentFolderId ? foldersById.get(ws.currentFolderId) : null;
    return new Set(cur ? [...cur.ancestors, cur.id] : []);
  });
  const [saving, setSaving] = useState(false);
  const count = payload.docIds.length + payload.folderIds.length;

  const node = (f: FolderRecord, level: number): React.ReactNode => {
    const kids = childrenOf(folders, f.id);
    const disabled = blocked.has(f.id);
    const open = expanded.has(f.id);
    return (
      <div key={f.id}>
        <div
          onClick={() => !disabled && setTarget(f.id)}
          style={{ paddingLeft: 8 + level * 16 }}
          className={[
            'flex items-center gap-1.5 pr-2 py-2 rounded-md text-[12px] select-none',
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            target === f.id ? 'bg-avocat-gold/15 text-[#e8d4a0] ring-1 ring-avocat-gold/40' : !disabled ? 'text-[#c8c0ac] hover:bg-[#252218]' : 'text-[#c8c0ac]',
          ].join(' ')}
        >
          <button
            onClick={e => { e.stopPropagation(); setExpanded(p => { const n = new Set(p); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; }); }}
            className={`w-4 h-4 flex items-center justify-center text-[#6b6050] ${kids.length ? '' : 'invisible'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <span className="text-avocat-gold/80"><IconFolder /></span>
          <span className="truncate flex-1">{f.name}</span>
          {current === f.id && <span className="text-[10px] text-[#6b6050]">actual</span>}
        </div>
        {open && kids.map(k => node(k, level + 1))}
      </div>
    );
  };

  const submit = async () => {
    setSaving(true);
    await ws.moveItems(payload, target);
    setSaving(false);
    onClose();
  };

  return (
    <ModalShell title={`Mover ${count} elemento${count !== 1 ? 's' : ''} a…`} onClose={onClose} sheetOnMobile>
      <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto -mx-1 px-1 border border-[#2e2b20] rounded-lg py-1 bg-[#161410]">
        <div
          onClick={() => setTarget(null)}
          className={`flex items-center gap-1.5 px-2 py-2 rounded-md text-[12px] cursor-pointer select-none ${target === null ? 'bg-avocat-gold/15 text-[#e8d4a0] ring-1 ring-avocat-gold/40' : 'text-[#c8c0ac] hover:bg-[#252218]'}`}
        >
          <span className="w-4 h-4" />
          <span className="font-medium flex-1">{ROOT_LABEL}</span>
          {current === null && <span className="text-[10px] text-[#6b6050]">actual</span>}
        </div>
        {childrenOf(folders, null).map(f => node(f, 1))}
      </div>
      <p className="text-[11px] text-[#6b6050] truncate">Destino: {folderPathLabel(target, foldersById)}</p>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="BtnGold" size="sm" loading={saving} disabled={target === current} onClick={submit}>Mover aquí</Button>
      </div>
    </ModalShell>
  );
}

// ── Delete folder ────────────────────────────────────────────────

function DeleteFolderDialog({ folder, onClose }: { folder: FolderRecord; onClose: () => void }) {
  const ws = useDocumentsWorkspace();
  const [mode, setMode] = useState<'move-up' | 'delete-all'>('move-up');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const r = planFolderDelete(ws.folders, ws.docs, folder.id, 'delete-all');
    return r.ok ? r.plan.counts : { folders: 0, documents: 0 };
  }, [ws.folders, ws.docs, folder.id]);
  const empty = counts.folders === 0 && counts.documents === 0;
  const parentLabel = folder.parentId ? ws.foldersById.get(folder.parentId)?.name ?? 'la carpeta superior' : ROOT_LABEL;

  const submit = async () => {
    setSaving(true);
    const err = await ws.deleteFolder(folder.id, empty ? 'move-up' : mode, mode === 'delete-all' ? counts : undefined);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  const contentLabel = [
    counts.folders ? `${counts.folders} subcarpeta${counts.folders !== 1 ? 's' : ''}` : '',
    counts.documents ? `${counts.documents} documento${counts.documents !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' y ');

  return (
    <ModalShell title="Eliminar carpeta" onClose={onClose}>
      <p className="text-[13px] text-[#c8c0ac]">
        ¿Eliminar <span className="text-[#e8d4a0] font-medium">&quot;{folder.name}&quot;</span>?
        {!empty && <> Contiene {contentLabel}.</>}
      </p>
      {!empty && (
        <div className="space-y-2">
          <label className={`flex gap-2.5 p-3 rounded-lg border cursor-pointer ${mode === 'move-up' ? 'border-avocat-gold/40 bg-avocat-gold/5' : 'border-[#2e2b20]'}`}>
            <input type="radio" checked={mode === 'move-up'} onChange={() => { setMode('move-up'); setAck(false); }} className="mt-0.5 accent-avocat-gold" />
            <span>
              <span className="block text-[12px] text-[#e8d4a0] font-medium">Mover contenido a la carpeta superior</span>
              <span className="block text-[11px] text-[#6b6050] mt-0.5">Todo pasa a «{parentLabel}». No se borra ningún documento.</span>
            </span>
          </label>
          <label className={`flex gap-2.5 p-3 rounded-lg border cursor-pointer ${mode === 'delete-all' ? 'border-red-500/40 bg-red-500/5' : 'border-[#2e2b20]'}`}>
            <input type="radio" checked={mode === 'delete-all'} onChange={() => setMode('delete-all')} className="mt-0.5 accent-red-500" />
            <span>
              <span className="block text-[12px] text-red-400 font-medium">Eliminar todo</span>
              <span className="block text-[11px] text-[#6b6050] mt-0.5">Borra la carpeta, {contentLabel}. No se puede deshacer.</span>
            </span>
          </label>
          {mode === 'delete-all' && (
            <label className="flex items-center gap-2 text-[11px] text-[#c8c0ac] cursor-pointer">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="accent-red-500" />
              Entiendo que se eliminarán {counts.documents} documento{counts.documents !== 1 ? 's' : ''} de forma permanente.
            </label>
          )}
        </div>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="BtnGold" size="sm" loading={saving} disabled={mode === 'delete-all' && !empty && !ack} onClick={submit}
          className="!bg-red-500/80 hover:!bg-red-500 !border-red-500/30">
          {mode === 'delete-all' && !empty ? 'Eliminar todo' : 'Eliminar carpeta'}
        </Button>
      </div>
    </ModalShell>
  );
}

// ── Organizar automáticamente ────────────────────────────────────

function AutoOrganizeModal({ onClose }: { onClose: () => void }) {
  const ws = useDocumentsWorkspace();
  const { userDoc } = useAppAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groups = useMemo(
    () => planAutoOrganize({ docs: ws.docs, cases: ws.cases, clients: ws.clients }, sanitizeFolderName),
    [ws.docs, ws.cases, ws.clients],
  );
  const total = groups.reduce((n, g) => n + g.docIds.length, 0);

  const apply = async () => {
    setSaving(true); setError('');
    try {
      // Reuse existing folders with the same name (case-insensitive) instead of duplicating.
      const known = [...ws.folders];
      const ensure = async (parent: FolderRecord | null, name: string) => {
        const lower = name.toLocaleLowerCase('es');
        const existing = known.find(f => (f.parentId ?? null) === (parent?.id ?? null) && f.name.toLocaleLowerCase('es') === lower);
        if (existing) return existing;
        const created = await createFolderDoc(userDoc.uid, name, parent);
        known.push(created);
        return created;
      };
      for (const g of groups) {
        const parent = await ensure(null, g.parentName);
        const folder = await ensure(parent, g.name);
        await moveDocumentsToFolder(g.docIds, folder.id);
      }
      await ws.reload();
      ws.notify({ kind: 'ok', text: `${total} documento${total !== 1 ? 's' : ''} organizados en ${groups.length} carpeta${groups.length !== 1 ? 's' : ''}` });
      onClose();
    } catch {
      setError('No se pudo completar. Lo ya creado se mantiene; puedes reintentar.');
      await ws.reload();
    } finally {
      setSaving(false);
    }
  };

  const byParent = (p: 'Casos' | 'Clientes') => groups.filter(g => g.parentName === p);

  return (
    <ModalShell title="Organizar automáticamente" onClose={onClose} sheetOnMobile>
      {groups.length === 0 ? (
        <p className="text-[13px] text-[#6b6050]">No hay documentos en la raíz vinculados a casos o clientes.</p>
      ) : (
        <>
          <p className="text-[12px] text-[#c8c0ac]">
            Proponemos mover <span className="text-[#e8d4a0] font-medium">{total} documento{total !== 1 ? 's' : ''}</span> de
            «{ROOT_LABEL}» a estas carpetas según su caso o cliente. No se borra nada y los vínculos se mantienen.
          </p>
          <div className="flex-1 min-h-0 max-h-[45vh] overflow-y-auto border border-[#2e2b20] rounded-lg bg-[#161410] p-2 space-y-2">
            {(['Casos', 'Clientes'] as const).map(p => byParent(p).length > 0 && (
              <div key={p}>
                <p className="flex items-center gap-1.5 text-[12px] text-[#e8d4a0] font-medium px-1">
                  <span className="text-avocat-gold"><IconFolder /></span>{p}
                </p>
                {byParent(p).map(g => (
                  <p key={g.name} className="flex items-center gap-1.5 text-[12px] text-[#c8c0ac] pl-6 pr-1 py-0.5">
                    <span className="text-avocat-gold/70"><IconFolder /></span>
                    <span className="truncate flex-1">{g.name}</span>
                    <span className="text-[10px] text-[#6b6050]">{g.docIds.length} doc{g.docIds.length !== 1 ? 's' : ''}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        {groups.length > 0 && <Button variant="BtnGold" size="sm" loading={saving} onClick={apply}>Aplicar</Button>}
      </div>
    </ModalShell>
  );
}
