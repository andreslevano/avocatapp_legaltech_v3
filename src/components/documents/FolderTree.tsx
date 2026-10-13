'use client';

import { useEffect, useRef, useState } from 'react';
import { useDocumentsWorkspace } from '@/contexts/DocumentsWorkspaceContext';
import { childrenOf, ROOT_LABEL } from '@/lib/folders/tree';
import type { FolderRecord } from '@/lib/folders/types';
import { isItemDrag, readDragPayload, setDragPayload, type DocsLocation } from './workspace';

export const IconFolder = ({ className = 'w-3.5 h-3.5', open = false }: { className?: string; open?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    {open
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />}
  </svg>
);

const IconView = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h10.5" />
  </svg>
);

const ROW = 'flex items-center gap-1.5 pr-2 py-1.5 rounded-md text-[12px] font-sans transition-colors cursor-pointer select-none';

/** Folder tree + smart views shown in the app Sidebar on /documents. */
export default function FolderTree({ onNavigate }: { onNavigate?: () => void }) {
  const ws = useDocumentsWorkspace();
  const { folders, foldersById, location, currentFolderId, views } = ws;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropId, setDropId] = useState<string | null | undefined>(undefined); // null = root
  const [menu, setMenu] = useState<{ folder: FolderRecord; top: number; left: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the current folder visible: expand its ancestors.
  useEffect(() => {
    const cur = currentFolderId ? foldersById.get(currentFolderId) : null;
    if (!cur?.ancestors.length) return;
    setExpanded(prev => {
      if (cur.ancestors.every(id => prev.has(id))) return prev;
      return new Set([...prev, ...cur.ancestors]);
    });
  }, [currentFolderId, foldersById]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const go = (loc: DocsLocation) => { ws.navigate(loc); onNavigate?.(); };
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Drop target props shared by root and folder nodes.
  const dropProps = (targetId: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!isItemDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropId !== targetId) setDropId(targetId);
    },
    onDragEnter: (e: React.DragEvent) => {
      if (!isItemDrag(e) || !targetId || expanded.has(targetId)) return;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setExpanded(prev => new Set([...prev, targetId])), 700);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setDropId(cur => (cur === targetId ? undefined : cur));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setDropId(undefined);
      const payload = readDragPayload(e);
      if (payload) ws.moveItems(payload, targetId);
    },
  });

  const renderNode = (f: FolderRecord, level: number) => {
    const kids = childrenOf(folders, f.id);
    const isOpen = expanded.has(f.id);
    const active = location.kind === 'folder' && currentFolderId === f.id;
    const isDrop = dropId === f.id;
    return (
      <div key={f.id}>
        <div
          {...dropProps(f.id)}
          draggable
          onDragStart={e => setDragPayload(e, { docIds: [], folderIds: [f.id] })}
          onClick={() => go({ kind: 'folder', folderId: f.id })}
          onContextMenu={e => { e.preventDefault(); setMenu({ folder: f, top: e.clientY, left: e.clientX }); }}
          style={{ paddingLeft: 8 + level * 14 }}
          className={[
            ROW, 'group',
            isDrop ? 'bg-avocat-gold/15 ring-1 ring-avocat-gold/50 text-[#e8d4a0]'
              : active ? 'bg-[#252218] text-[#e8d4a0]' : 'text-[#c8c0ac] hover:bg-[#1a1812] hover:text-[#e8d4a0]',
          ].join(' ')}
        >
          <button
            onClick={e => { e.stopPropagation(); if (kids.length) toggle(f.id); }}
            aria-label={isOpen ? 'Contraer' : 'Expandir'}
            className={`w-4 h-4 flex items-center justify-center text-[#6b6050] flex-shrink-0 ${kids.length ? 'hover:text-[#c8c0ac]' : 'invisible'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <span className={active || isDrop ? 'text-avocat-gold' : 'text-[#6b6050] group-hover:text-avocat-gold/80'}>
            <IconFolder open={isOpen && kids.length > 0} />
          </span>
          <span className="truncate flex-1 min-w-0">{f.name}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setMenu({ folder: f, top: r.bottom + 4, left: r.left });
            }}
            onMouseDown={e => e.stopPropagation()}
            aria-label="Acciones de carpeta"
            className="md:opacity-0 md:group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#2e2b20] flex-shrink-0"
          >
            ···
          </button>
        </div>
        {isOpen && kids.map(k => renderNode(k, level + 1))}
      </div>
    );
  };

  const topLevel = childrenOf(folders, null);
  const rootActive = location.kind === 'folder' && !currentFolderId;

  return (
    <div className="flex-1 overflow-y-auto py-2 px-2">
      {/* Root */}
      <div
        {...dropProps(null)}
        onClick={() => go({ kind: 'folder', folderId: null })}
        className={[
          ROW, 'pl-2',
          dropId === null ? 'bg-avocat-gold/15 ring-1 ring-avocat-gold/50 text-[#e8d4a0]'
            : rootActive ? 'bg-[#252218] text-[#e8d4a0]' : 'text-[#c8c0ac] hover:bg-[#1a1812] hover:text-[#e8d4a0]',
        ].join(' ')}
      >
        <span className="w-4 h-4 flex-shrink-0" />
        <span className={rootActive ? 'text-avocat-gold' : 'text-[#6b6050]'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </span>
        <span className="truncate font-medium">{ROOT_LABEL}</span>
      </div>

      {topLevel.map(f => renderNode(f, 1))}

      {folders.length === 0 && !ws.loading && (
        <p className="px-3 py-3 text-[11px] text-[#3a3630] leading-relaxed">
          Sin carpetas aún. Crea una con <span className="text-[#6b6050]">+</span> y arrastra documentos dentro.
        </p>
      )}

      {/* Smart views (virtual) */}
      {views.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#2e2b20]">
          <p className="px-2 pb-1.5 text-[10px] font-sans font-semibold tracking-widest uppercase text-[#6b6050]">Vistas</p>
          {views.map(v => {
            const active = location.kind === 'view' && location.view === v.id;
            return (
              <div
                key={v.id}
                onClick={() => go({ kind: 'view', view: v.id, key: null })}
                className={[ROW, 'pl-2', active ? 'bg-[#252218] text-[#e8d4a0]' : 'text-[#c8c0ac] hover:bg-[#1a1812] hover:text-[#e8d4a0]'].join(' ')}
              >
                <span className="w-4 h-4 flex-shrink-0" />
                <span className={active ? 'text-avocat-gold' : 'text-[#6b6050]'}><IconView /></span>
                <span className="truncate">{v.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Folder context menu */}
      {menu && (
        <div
          className="fixed z-[60] bg-[#1e1c16] border border-[#2e2b20] rounded-xl shadow-2xl py-1 w-48"
          style={{ top: Math.min(menu.top, window.innerHeight - 200), left: Math.min(menu.left, window.innerWidth - 200) }}
          onMouseDown={e => e.stopPropagation()}
        >
          {[
            { label: 'Nueva subcarpeta', run: () => ws.openDialog({ type: 'new-folder', parentId: menu.folder.id }) },
            { label: 'Renombrar',        run: () => ws.openDialog({ type: 'rename-folder', folder: menu.folder }) },
            { label: 'Mover a…',         run: () => ws.openDialog({ type: 'move', payload: { docIds: [], folderIds: [menu.folder.id] } }) },
          ].map(item => (
            <button key={item.label} onClick={() => { setMenu(null); item.run(); onNavigate?.(); }}
              className="w-full text-left px-4 py-2 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] transition-colors">
              {item.label}
            </button>
          ))}
          <div className="border-t border-[#2e2b20] mt-1 pt-1">
            <button onClick={() => { setMenu(null); ws.openDialog({ type: 'delete-folder', folder: menu.folder }); onNavigate?.(); }}
              className="w-full text-left px-4 py-2 text-[12px] text-red-400 hover:bg-red-500/5 transition-colors">
              Eliminar carpeta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
