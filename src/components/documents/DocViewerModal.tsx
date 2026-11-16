'use client';

// Full-screen document viewer for /documents: read a document at full size without downloading it.
// ‹ › (and ←/→) move through the documents currently listed; Esc closes and focus returns to where
// it was. Content: DocRender (PDF, Avocat .doc, .docx, images, text).

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import type { DocumentRecord } from '@/lib/storage-client';
import { formatBytes } from '@/lib/storage-client';
import { neighbour, viewerKind } from '@/lib/documents/viewer';
import DocRender from './DocRender';

interface Props {
  doc: DocumentRecord;
  /** Documents in the order shown in the table (prev / next). */
  list: DocumentRecord[];
  onNavigate: (doc: DocumentRecord) => void;
  onClose: () => void;
}

const ICON_BTN = 'inline-flex items-center justify-center min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-40';

export default function DocViewerModal({ doc, list, onNavigate, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prev = neighbour(list, doc.id, -1);
  const next = neighbour(list, doc.id, 1);
  const { url, ext } = viewerKind(doc);
  const position = list.findIndex(d => d.id === doc.id);

  const go = useCallback((d: DocumentRecord | null) => { if (d) onNavigate(d); }, [onNavigate]);

  // Focus in, restore on close; Esc / ←→; keep Tab inside the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => opener?.focus?.();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select');
      if (!typing && e.key === 'ArrowLeft') { e.preventDefault(); go(prev); }
      if (!typing && e.key === 'ArrowRight') { e.preventDefault(); go(next); }
      if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), iframe, [tabindex="0"]');
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, prev, next, onClose]);

  const hasWord = (doc.type ?? '').toLowerCase().startsWith('doc');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="viewer-title"
        className="relative flex flex-col bg-surface border border-border w-full h-full sm:w-[92vw] sm:h-[92vh] sm:rounded-2xl shadow-elevated overflow-hidden">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border flex-shrink-0">
          <div className="flex items-center">
            <button type="button" className={ICON_BTN} onClick={() => go(prev)} disabled={!prev} aria-label="Documento anterior">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" className={ICON_BTN} onClick={() => go(next)} disabled={!next} aria-label="Documento siguiente">
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="viewer-title" className="font-sans text-small font-semibold text-text-heading truncate" title={doc.name}>{doc.name}</h2>
            <p className="text-caption text-text-muted">
              {ext.toUpperCase()} · {formatBytes(doc.size)}
              {list.length > 1 && position >= 0 && <span className="hidden sm:inline"> · {position + 1} de {list.length}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasWord && (
              <a href={doc.downloadUrl} download target="_blank" rel="noopener noreferrer" className={`${ICON_BTN} gap-1.5 text-caption`} aria-label="Descargar Word">
                <Download size={18} aria-hidden /><span className="hidden md:inline">Word</span>
              </a>
            )}
            {doc.pdfDownloadUrl && (
              <a href={doc.pdfDownloadUrl} download target="_blank" rel="noopener noreferrer" className={`${ICON_BTN} gap-1.5 text-caption`} aria-label="Descargar PDF">
                <Download size={18} aria-hidden /><span className="hidden md:inline">PDF</span>
              </a>
            )}
            {!hasWord && !doc.pdfDownloadUrl && (
              <a href={doc.downloadUrl} download target="_blank" rel="noopener noreferrer" className={ICON_BTN} aria-label="Descargar">
                <Download size={18} aria-hidden />
              </a>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" className={ICON_BTN} aria-label="Abrir en una pestaña nueva" title="Abrir en una pestaña nueva">
              <ExternalLink size={18} aria-hidden />
            </a>
            <button type="button" className={ICON_BTN} onClick={onClose} aria-label="Cerrar visor">
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-bg">
          <DocRender key={doc.id} doc={doc} />
        </div>
      </div>
    </div>
  );
}
