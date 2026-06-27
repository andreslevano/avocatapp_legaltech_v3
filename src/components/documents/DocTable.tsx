'use client';

import { useState, useEffect, useRef } from 'react';
import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import {
  inferDocType, inferStatus, fileIcon, formatDate,
  getCaseForDoc, getClientForDoc,
  STATUS_STYLE, TIPO_STYLE,
  type SortCol, type SortDir,
} from './helpers';
import { formatBytes } from '@/lib/storage-client';

export type DocAction = 'preview' | 'link-case' | 'link-client' | 'rename' | 'download' | 'analyze' | 'delete';

interface Props {
  docs: DocumentRecord[];
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
}

const TH = 'px-3 py-2.5 text-left text-[10px] font-semibold tracking-widest uppercase text-[#6b6050] cursor-pointer select-none whitespace-nowrap hover:text-[#c8c0ac] transition-colors';
const TD = 'px-3 py-2.5 text-[12px]';

const MENU_ITEMS: { label: string; action: DocAction }[] = [
  { label: 'Ver / previsualizar',  action: 'preview'     },
  { label: 'Vincular a caso',      action: 'link-case'   },
  { label: 'Vincular a cliente',   action: 'link-client' },
  { label: 'Renombrar',            action: 'rename'      },
  { label: 'Descargar',            action: 'download'    },
  { label: 'Analizar con IA',      action: 'analyze'     },
];

export default function DocTable({
  docs, cases, clients, selected, onToggleSelect, onSelectAll,
  sortCol, sortDir, onSort, previewDocId, onAction,
}: Props) {
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [menuPos,   setMenuPos]   = useState({ top: 0, right: 0 });
  const [renamingId,  setRenamingId]  = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuDocId) return;
    const close = () => setMenuDocId(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [menuDocId]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const openMenu = (e: React.MouseEvent | React.TouchEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    e.preventDefault();
    const target = (e as React.MouseEvent).currentTarget as HTMLElement
      ?? (e as React.TouchEvent).currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuDocId(doc.id);
  };

  const startRename = (doc: DocumentRecord) => {
    setMenuDocId(null);
    setRenamingId(doc.id);
    setRenameValue(doc.name);
  };

  const commitRename = (doc: DocumentRecord) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== doc.name) onAction('rename', { ...doc, name: trimmed });
    setRenamingId(null);
  };

  const allSelected = docs.length > 0 && docs.every(d => selected.has(d.id));

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[13px] text-[#6b6050]">No hay documentos que coincidan con los filtros.</p>
      </div>
    );
  }

  const menuDoc = menuDocId ? docs.find(d => d.id === menuDocId) : null;

  const SortIcon = ({ col }: { col: SortCol }) => (
    <span className="ml-1 text-[9px] opacity-50">
      {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <>
      {/* ── Mobile card list (< md) ───────────────────────────── */}
      <div className="md:hidden divide-y divide-[#2e2b20]">
        {docs.map(d => {
          const tipo       = inferDocType(d.name);
          const status     = inferStatus(d);
          const displayExt = (d.pdfDownloadUrl ? 'pdf' : d.type).toLowerCase();
          const caseDoc    = getCaseForDoc(d, cases);
          const isActive   = previewDocId === d.id;

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
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIPO_STYLE[tipo] ?? TIPO_STYLE.Otro}`}>{tipo}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLE[status] ?? STATUS_STYLE.Borrador}`}>{status}</span>
                  {caseDoc && <span className="text-[10px] text-[#6b6050] truncate max-w-[100px]">{caseDoc.title}</span>}
                </div>
                <p className="text-[10px] text-[#3a3630] mt-0.5">{formatDate(d.createdAt)}</p>
              </div>
              {/* Menu button — always visible on mobile */}
              <button
                onClick={e => openMenu(e, d)}
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
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e2b20]">
            {docs.map(d => {
              const caseDoc    = getCaseForDoc(d, cases);
              const client     = getClientForDoc(d, cases, clients);
              const tipo       = inferDocType(d.name);
              const status     = inferStatus(d);
              const displayExt = (d.pdfDownloadUrl ? 'pdf' : d.type).toLowerCase();
              const isActive   = previewDocId === d.id;
              const isRenaming = renamingId === d.id;

              return (
                <tr
                  key={d.id}
                  onClick={() => !isRenaming && onAction('preview', d)}
                  className={`group transition-colors cursor-pointer ${isActive ? 'bg-avocat-gold/5' : 'hover:bg-[#252218]'}`}
                >
                  <td className={TD} onClick={e => { e.stopPropagation(); onToggleSelect(d.id); }}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => onToggleSelect(d.id)}
                      className="rounded border-[#2e2b20] bg-[#161410] accent-avocat-gold cursor-pointer" />
                  </td>

                  <td className={`${TD} max-w-[200px]`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{fileIcon(displayExt)}</span>
                      {isRenaming ? (
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(d)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(d); if (e.key === 'Escape') setRenamingId(null); }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 bg-[#161410] border border-avocat-gold/40 rounded px-2 py-0.5 text-[12px] text-[#c8c0ac] focus:outline-none"
                        />
                      ) : (
                        <span className="truncate text-[#c8c0ac] group-hover:text-[#e8d4a0] font-medium">{d.name}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#3a3630] mt-0.5 ml-7">{formatBytes(d.size)}</p>
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

                  <td className={TD} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => openMenu(e, d)}
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
      {menuDocId && menuDoc && (
        <div
          className="fixed z-50 bg-[#1e1c16] border border-[#2e2b20] rounded-xl shadow-2xl py-1 w-52"
          style={{ top: menuPos.top, right: menuPos.right }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {MENU_ITEMS.map(({ label, action }) => (
            <button
              key={action}
              onClick={() => {
                setMenuDocId(null);
                if (action === 'rename') startRename(menuDoc);
                else onAction(action, menuDoc);
              }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] active:bg-[#252218] transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="border-t border-[#2e2b20] mt-1 pt-1">
            <button
              onClick={() => { setMenuDocId(null); onAction('delete', menuDoc); }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-red-400 hover:bg-red-500/5 active:bg-red-500/5 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
