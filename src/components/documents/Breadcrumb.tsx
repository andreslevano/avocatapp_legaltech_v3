'use client';

import { useState } from 'react';
import { useDocumentsWorkspace } from '@/contexts/DocumentsWorkspaceContext';
import { folderPath, ROOT_LABEL } from '@/lib/folders/tree';
import { isItemDrag, readDragPayload, SMART_VIEWS, type DocsLocation } from './workspace';

interface Crumb { label: string; loc: DocsLocation; dropTarget?: string | null }

/** "Mis documentos › Clientes › Acme" — each segment navigates and accepts dropped items. */
export default function Breadcrumb({ viewGroupLabel }: { viewGroupLabel?: string }) {
  const ws = useDocumentsWorkspace();
  const { location, foldersById } = ws;
  const [over, setOver] = useState<number | null>(null);

  const crumbs: Crumb[] = [];
  if (location.kind === 'folder') {
    crumbs.push({ label: ROOT_LABEL, loc: { kind: 'folder', folderId: null }, dropTarget: null });
    for (const f of folderPath(ws.currentFolderId, foldersById)) {
      crumbs.push({ label: f.name, loc: { kind: 'folder', folderId: f.id }, dropTarget: f.id });
    }
  } else {
    const view = SMART_VIEWS.find(v => v.id === location.view);
    crumbs.push({ label: view?.label ?? 'Vista', loc: { kind: 'view', view: location.view, key: null } });
    if (location.key) crumbs.push({ label: viewGroupLabel ?? '…', loc: location });
  }

  const last = crumbs.length - 1;
  const parent = last > 0 ? crumbs[last - 1] : null;

  const dropHandlers = (i: number, c: Crumb) => c.dropTarget === undefined ? {} : {
    onDragOver: (e: React.DragEvent) => { if (!isItemDrag(e)) return; e.preventDefault(); setOver(i); },
    onDragLeave: () => setOver(cur => (cur === i ? null : cur)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setOver(null);
      const p = readDragPayload(e);
      if (p) ws.moveItems(p, c.dropTarget ?? null);
    },
  };

  return (
    <div className="flex items-center gap-1 min-w-0">
      {/* Mobile: back to parent + current name */}
      {parent && (
        <button
          onClick={() => ws.navigate(parent.loc)}
          aria-label={`Volver a ${parent.label}`}
          className="md:hidden w-7 h-7 -ml-1 flex items-center justify-center rounded-lg text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218] flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      <h1 className="md:hidden font-sans font-medium text-[14px] text-[#e8d4a0] truncate leading-tight">{crumbs[last].label}</h1>

      {/* Desktop: full trail */}
      <nav aria-label="Ruta de carpetas" className="hidden md:flex items-center gap-0.5 min-w-0 text-[14px] font-sans">
        {crumbs.map((c, i) => (
          <span key={i} className={`flex items-center gap-0.5 ${i === last ? 'min-w-0' : 'flex-shrink-0'}`}>
            {i > 0 && <span className="text-[#3a3630] px-0.5">›</span>}
            {i === last ? (
              <h1 {...dropHandlers(i, c)}
                className={`font-medium text-[#e8d4a0] truncate leading-tight px-1 rounded ${over === i ? 'bg-avocat-gold/15 ring-1 ring-avocat-gold/50' : ''}`}>
                {c.label}
              </h1>
            ) : (
              <button
                {...dropHandlers(i, c)}
                onClick={() => ws.navigate(c.loc)}
                className={`text-[#6b6050] hover:text-[#e8d4a0] transition-colors truncate max-w-[160px] px-1 rounded ${over === i ? 'bg-avocat-gold/15 ring-1 ring-avocat-gold/50 text-[#e8d4a0]' : ''}`}
              >
                {c.label}
              </button>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
