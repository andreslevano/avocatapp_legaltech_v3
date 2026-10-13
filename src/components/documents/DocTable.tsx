'use client';

import { useState, useEffect, useRef } from 'react';
import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import {
  inferDocType, inferOrigin, inferStatus, fileIcon, formatDate,
  getCaseForDoc, getClientForDoc,
  STATUS_STYLE, TIPO_STYLE,
  type SortCol, type SortDir,
} from './helpers';
import { formatBytes } from '@/lib/storage-client';
import { IconFolder } from './FolderTree';
import { isItemDrag, readDragPayload, setDragPayload, type DragPayload } from './workspace';

export type DocAction = 'preview' | 'link-case' | 'link-client' | 'rename' | 'move' | 'download' | 'analyze' | 'delete';
export type FolderAction = 'open' | 'rename' | 'move' | 'delete';

/** A row listed before the files: a real folder, or a virtual group in a smart view. */
export interface FolderRow {
  id: string;
  name: string;
  itemCount: number;
  modified: unknown;
  path?: string;        // shown under the name in global search results
  virtual?: boolean;    // smart-view group: not draggable, no drop, no menu
}

interface Props {
  docs: DocumentRecord[];
  folderRows?: FolderRow[];
  cases: CaseDoc[];
  clients: ClientDoc[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
  previewDocId: string | null;
  onAction: (action: DocAction, doc: DocumentRecord) => void;
  // Folders (D1) — all optional so the table still works without folders.
  canMove?: boolean;
  docPath?: (d: DocumentRecord) => string | null;
  onOpenFolder?: (row: FolderRow) => void;
  onFolderAction?: (action: FolderAction, row: FolderRow) => void;
  onRenameFolder?: (id: string, name: string) => Promise<string | null>;
  onDropOnFolder?: (payload: DragPayload, folderId: string) => void;
  emptyState?: React.ReactNode;
}

const TH = 'px-3 py-2.5 text-left text-[10px] font-semibold tracking-widest uppercase text-[#6b6050] cursor-pointer select-none whitespace-nowrap hover:text-[#c8c0ac] transition-colors';
const TD = 'px-3 py-2.5 text-[12px]';

const MENU_ITEMS: { label: string; action: DocAction; needsMove?: boolean }[] = [
  { label: 'Ver / previsualizar',  action: 'preview'     },
  { label: 'Mover a…',             action: 'move', needsMove: true },
  { label: 'Vincular a caso',      action: 'link-case'   },
  { label: 'Vincular a cliente',   action: 'link-client' },
  { label: 'Renombrar',            action: 'rename'      },
  { label: 'Descargar',            action: 'download'    },
  { label: 'Analizar con IA',      action: 'analyze'     },
];

const FOLDER_MENU: { label: string; action: FolderAction }[] = [
  { label: 'Abrir',      action: 'open'   },
  { label: 'Renombrar',  action: 'rename' },
  { label: 'Mover a…',   action: 'move'   },
];

const ORIGEN_STYLE: Record<string, string> = {
  Avocat:     'text-avocat-gold/80',
  Subido:     'text-[#6b6050]',
  OneDrive:   'text-sky-400',
  SharePoint: 'text-teal-400',
};

const itemsLabel = (n: number) => `${n} elemento${n !== 1 ? 's' : ''}`;

export default function DocTable({
  docs, folderRows = [], cases, clients, selected, onToggleSelect, onSelectAll,
  sortCol, sortDir, onSort, previewDocId, onAction,
  canMove = false, docPath, onOpenFolder, onFolderAction, onRenameFolder, onDropOnFolder, emptyState,
}: Props) {
  const [menu, setMenu] = useState<{ kind: 'doc' | 'folder'; id: string } | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [renamingId,  setRenamingId]  = useState<string | null>(null);   // doc id or "f:<folderId>"
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [menu]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const openMenu = (e: React.MouseEvent | React.TouchEvent, kind: 'doc' | 'folder', id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const top = Math.min(rect.bottom + 4, window.innerHeight - 320);
    setMenuPos({ top: Math.max(8, top), right: window.innerWidth - rect.right });
    setMenu({ kind, id });
  };

  const startRename = (id: string, current: string) => {
    setMenu(null);
    setRenamingId(id);
    setRenameValue(current);
    setRenameError('');
  };

  const commitRename = (doc: DocumentRecord) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== doc.name) onAction('rename', { ...doc, name: trimmed });
    setRenamingId(null);
  };

  const commitFolderRename = async (row: FolderRow) => {
    if (renamingId !== `f:${row.id}`) return;
    const err = onRenameFolder ? await onRenameFolder(row.id, renameValue) : null;
    if (err) { setRenameError(err); return; }   // keep the input open; Escape cancels
    setRenamingId(null);
  };

  // ── Drag & drop ────────────────────────────────────────────────
  const dragDocProps = (d: DocumentRecord) => !canMove ? {} : {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      // Dragging a selected row carries the whole selection.
      const docIds = selected.has(d.id) ? Array.from(selected) : [d.id];
      setDragPayload(e, { docIds, folderIds: [] });
    },
  };

  const folderRowProps = (row: FolderRow) => row.virtual || !canMove ? {} : {
    draggable: true,
    onDragStart: (e: React.DragEvent) => setDragPayload(e, { docIds: [], folderIds: [row.id] }),
    onDragOver: (e: React.DragEvent) => {
      if (!isItemDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropRowId !== row.id) setDropRowId(row.id);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDropRowId(cur => (cur === row.id ? null : cur));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropRowId(null);
      const p = readDragPayload(e);
      if (p && !p.folderIds.includes(row.id)) onDropOnFolder?.(p, row.id);
    },
  };

  const allSelected = docs.length > 0 && docs.every(d => selected.has(d.id));

  if (docs.length === 0 && folderRows.length === 0) {
    return emptyState ? <>{emptyState}</> : (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[13px] text-[#6b6050]">No hay documentos que coincidan con los filtros.</p>
      </div>
    );
  }

  const menuDoc = menu?.kind === 'doc' ? docs.find(d => d.id === menu.id) : null;
  const menuFolder = menu?.kind === 'folder' ? folderRows.find(r => r.id === menu.id) : null;

  const SortIcon = ({ col }: { col: SortCol }) => (
    <span className="ml-1 text-[9px] opacity-50">
      {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const renameInput = (onCommit: () => void) => (
    <input
      ref={renameRef}
      value={renameValue}
      onChange={e => { setRenameValue(e.target.value); setRenameError(''); }}
      onBlur={onCommit}
      onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') setRenamingId(null); }}
      onClick={e => e.stopPropagation()}
      className={`flex-1 min-w-0 bg-[#161410] border rounded px-2 py-0.5 text-[12px] text-[#c8c0ac] focus:outline-none ${renameError ? 'border-red-500/60' : 'border-avocat-gold/40'}`}
    />
  );

  const folderMenuButton = (row: FolderRow, mobile: boolean) => !row.virtual && onFolderAction && (
    <button
      onClick={e => openMenu(e, 'folder', row.id)}
      aria-label="Acciones de carpeta"
      className={mobile
        ? 'w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#2e2b20] transition-colors text-[16px] leading-none'
        : 'opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#2e2b20]'}
    >
      ···
    </button>
  );

  return (
    <>
      {/* ── Mobile card list (< md) ───────────────────────────── */}
      <div className="md:hidden divide-y divide-[#2e2b20]">
        {folderRows.map(row => (
          <div
            key={`f-${row.id}`}
            onClick={() => onOpenFolder?.(row)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-[#252218] transition-colors"
          >
            <span className="w-[13px] flex-shrink-0" />
            <span className="text-avocat-gold/80 flex-shrink-0"><IconFolder className="w-6 h-6" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-sans font-medium text-[#c8c0ac] truncate">{row.name}</p>
              <p className="text-[10px] text-[#6b6050] mt-0.5 truncate">{row.path ?? `${itemsLabel(row.itemCount)} · ${formatDate(row.modified)}`}</p>
            </div>
            {folderMenuButton(row, true) || (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#3a3630] flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </div>
        ))}
        {docs.map(d => {
          const tipo       = inferDocType(d.name);
          const status     = inferStatus(d);
          const displayExt = (d.pdfDownloadUrl ? 'pdf' : d.type).toLowerCase();
          const caseDoc    = getCaseForDoc(d, cases);
          const isActive   = previewDocId === d.id;
          const path       = docPath?.(d);

          return (
            <div
              key={d.id}
              onClick={() => onAction('preview', d)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-avocat-gold/5' : 'active:bg-[#252218]'}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => onToggleSelect(d.id)}
                onClick={e => e.stopPropagation()}
                className="rounded border-[#2e2b20] bg-[#161410] accent-avocat-gold flex-shrink-0"
              />
              {/* Icon */}
              <span className="text-xl flex-shrink-0">{fileIcon(displayExt)}</span>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-sans font-medium text-[#c8c0ac] truncate">{d.name}</p>
                {path && <p className="text-[10px] text-[#6b6050] truncate">{path}</p>}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIPO_STYLE[tipo] ?? TIPO_STYLE.Otro}`}>{tipo}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLE[status] ?? STATUS_STYLE.Borrador}`}>{status}</span>
                  {caseDoc && <span className="text-[10px] text-[#6b6050] truncate max-w-[100px]">{caseDoc.title}</span>}
                </div>
                <p className="text-[10px] text-[#3a3630] mt-0.5">{formatDate(d.createdAt)} · {inferOrigin(d)}</p>
              </div>
              {/* Menu button — always visible on mobile */}
              <button
                onClick={e => openMenu(e, 'doc', d.id)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#2e2b20] transition-colors text-[16px] leading-none"
              >
                ···
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (≥ md) ──────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[12px] font-sans border-collapse">
          <thead>
            <tr className="border-b border-[#2e2b20]">
              <th className="px-3 py-2.5 w-8">
                <input type="checkbox" checked={allSelected} onChange={onSelectAll}
                  className="rounded border-[#2e2b20] bg-[#161410] accent-avocat-gold cursor-pointer" />
              </th>
              <th className={TH} onClick={() => onSort('name')}>Nombre<SortIcon col="name" /></th>
              <th className={TH} onClick={() => onSort('tipo')}>Tipo<SortIcon col="tipo" /></th>
              <th className={`${TH} hidden lg:table-cell`} onClick={() => onSort('caso')}>Caso<SortIcon col="caso" /></th>
              <th className={`${TH} hidden xl:table-cell`} onClick={() => onSort('cliente')}>Cliente<SortIcon col="cliente" /></th>
              <th className={TH} onClick={() => onSort('fecha')}>Fecha<SortIcon col="fecha" /></th>
              <th className={TH} onClick={() => onSort('status')}>Estado<SortIcon col="status" /></th>
              <th className={`${TH} hidden lg:table-cell`} onClick={() => onSort('origen')}>Origen<SortIcon col="origen" /></th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e2b20]">
            {folderRows.map(row => {
              const isRenaming = renamingId === `f:${row.id}`;
              const isDrop = dropRowId === row.id;
              return (
                <tr
                  key={`f-${row.id}`}
                  {...folderRowProps(row)}
                  onClick={() => !isRenaming && onOpenFolder?.(row)}
                  onDoubleClick={() => !isRenaming && onOpenFolder?.(row)}
                  className={`group transition-colors cursor-pointer ${isDrop ? 'bg-avocat-gold/10 outline outline-1 outline-avocat-gold/50' : 'hover:bg-[#252218]'}`}
                >
                  <td className={TD} />
                  <td className={`${TD} max-w-[260px]`}>
                    <div className="flex items-center gap-2">
                      <span className="text-avocat-gold/80 flex-shrink-0"><IconFolder className="w-4 h-4" /></span>
                      {isRenaming ? renameInput(() => commitFolderRename(row)) : (
                        <span className="truncate text-[#c8c0ac] group-hover:text-[#e8d4a0] font-medium">{row.name}</span>
                      )}
                    </div>
                    {isRenaming && renameError
                      ? <p className="text-[10px] text-red-400 mt-0.5 ml-6">{renameError}</p>
                      : <p className="text-[10px] text-[#3a3630] mt-0.5 ml-6 truncate">{row.path ?? itemsLabel(row.itemCount)}</p>}
                  </td>
                  <td className={`${TD} text-[#3a3630]`}>Carpeta</td>
                  <td className={`${TD} hidden lg:table-cell text-[#3a3630]`}>—</td>
                  <td className={`${TD} hidden xl:table-cell text-[#3a3630]`}>—</td>
                  <td className={`${TD} text-[#6b6050] whitespace-nowrap`}>{formatDate(row.modified)}</td>
                  <td className={`${TD} text-[#6b6050]`}>{row.path ? itemsLabel(row.itemCount) : ''}</td>
                  <td className={`${TD} hidden lg:table-cell`} />
                  <td className={TD} onClick={e => e.stopPropagation()}>{folderMenuButton(row, false)}</td>
                </tr>
              );
            })}
            {docs.map(d => {
              const caseDoc    = getCaseForDoc(d, cases);
              const client     = getClientForDoc(d, cases, clients);
              const tipo       = inferDocType(d.name);
              const status     = inferStatus(d);
              const origen     = inferOrigin(d);
              const displayExt = (d.pdfDownloadUrl ? 'pdf' : d.type).toLowerCase();
              const isActive   = previewDocId === d.id;
              const isRenaming = renamingId === d.id;
              const path       = docPath?.(d);

              return (
                <tr
                  key={d.id}
                  {...dragDocProps(d)}
                  onClick={() => !isRenaming && onAction('preview', d)}
                  className={`group transition-colors cursor-pointer ${isActive ? 'bg-avocat-gold/5' : 'hover:bg-[#252218]'}`}
                >
                  <td className={TD} onClick={e => { e.stopPropagation(); onToggleSelect(d.id); }}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => onToggleSelect(d.id)}
                      className="rounded border-[#2e2b20] bg-[#161410] accent-avocat-gold cursor-pointer" />
                  </td>

                  <td className={`${TD} max-w-[260px]`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{fileIcon(displayExt)}</span>
                      {isRenaming ? renameInput(() => commitRename(d)) : (
                        <span className="truncate text-[#c8c0ac] group-hover:text-[#e8d4a0] font-medium">{d.name}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#3a3630] mt-0.5 ml-7 truncate">
                      {path ? <span className="text-[#6b6050]">{path}</span> : formatBytes(d.size)}
                    </p>
                  </td>

                  <td className={TD}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${TIPO_STYLE[tipo] ?? TIPO_STYLE.Otro}`}>{tipo}</span>
                  </td>

                  <td className={`${TD} hidden lg:table-cell text-[#6b6050] max-w-[160px]`}>
                    {caseDoc ? <span className="truncate block">{caseDoc.title}</span> : <span className="text-[#3a3630]">—</span>}
                  </td>

                  <td className={`${TD} hidden xl:table-cell text-[#6b6050]`}>
                    {client ? client.name : <span className="text-[#3a3630]">—</span>}
                  </td>

                  <td className={`${TD} text-[#6b6050] whitespace-nowrap`}>{formatDate(d.createdAt)}</td>

                  <td className={TD}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLE[status] ?? STATUS_STYLE.Borrador}`}>{status}</span>
                  </td>

                  <td className={`${TD} hidden lg:table-cell whitespace-nowrap ${ORIGEN_STYLE[origen] ?? ''}`}>{origen}</td>

                  <td className={TD} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => openMenu(e, 'doc', d.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#2e2b20]"
                    >
                      ···
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Context menu (shared mobile + desktop) ─────────────── */}
      {(menuDoc || menuFolder) && (
        <div
          className="fixed z-50 bg-[#1e1c16] border border-[#2e2b20] rounded-xl shadow-2xl py-1 w-52"
          style={{ top: menuPos.top, right: menuPos.right }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {menuDoc && MENU_ITEMS.filter(i => !i.needsMove || canMove).map(({ label, action }) => (
            <button
              key={action}
              onClick={() => {
                setMenu(null);
                if (action === 'rename') startRename(menuDoc.id, menuDoc.name);
                else onAction(action, menuDoc);
              }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] active:bg-[#252218] transition-colors"
            >
              {label}
            </button>
          ))}
          {menuFolder && FOLDER_MENU.map(({ label, action }) => (
            <button
              key={action}
              onClick={() => {
                setMenu(null);
                // Inline rename lives in the desktop table; on mobile the page opens a dialog.
                if (action === 'rename' && window.matchMedia('(min-width: 768px)').matches) startRename(`f:${menuFolder.id}`, menuFolder.name);
                else onFolderAction?.(action, menuFolder);
              }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] active:bg-[#252218] transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="border-t border-[#2e2b20] mt-1 pt-1">
            <button
              onClick={() => {
                setMenu(null);
                if (menuDoc) onAction('delete', menuDoc);
                else if (menuFolder) onFolderAction?.('delete', menuFolder);
              }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-red-400 hover:bg-red-500/5 active:bg-red-500/5 transition-colors"
            >
              {menuFolder ? 'Eliminar carpeta' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
