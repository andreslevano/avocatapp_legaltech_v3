'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import {
  fileIcon, formatDate, inferDocType, inferStatus,
  getCaseForDoc, getClientForDoc,
  STATUS_STYLE, TIPO_STYLE,
} from './helpers';
import { formatBytes } from '@/lib/storage-client';
import type { DocAction } from './DocTable';

interface Props {
  doc: DocumentRecord;
  cases: CaseDoc[];
  clients: ClientDoc[];
  onClose: () => void;
  onAction: (action: DocAction, doc: DocumentRecord) => void;
}

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export default function DocPreviewPanel({ doc: d, cases, clients, onClose, onAction }: Props) {
  const caseDoc  = getCaseForDoc(d, cases);
  const client   = getClientForDoc(d, cases, clients);
  const tipo     = inferDocType(d.name);
  const status   = inferStatus(d);
  const previewUrl = d.pdfDownloadUrl ?? d.downloadUrl;
  const ext      = (d.pdfDownloadUrl ? 'pdf' : d.type).toLowerCase();
  const isPdf    = ext === 'pdf';
  const isImage  = IMAGE_TYPES.has(ext);
  const isWord   = ext === 'doc' || ext === 'docx';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-[#2e2b20] flex-shrink-0">
        <span className="text-2xl mt-0.5 flex-shrink-0">{fileIcon(ext)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-sans font-semibold text-[#e8d4a0] truncate" title={d.name}>{d.name}</p>
          <p className="text-[10px] text-[#6b6050] mt-0.5">{ext.toUpperCase()} · {formatBytes(d.size)}</p>
        </div>
        <button onClick={onClose} className="text-[#6b6050] hover:text-[#c8c0ac] p-1 flex-shrink-0 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden min-h-0 bg-[#161410]">
        {isPdf && <iframe src={previewUrl} title={d.name} className="w-full h-full border-0" />}
        {isImage && (
          <div className="flex items-center justify-center h-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.downloadUrl} alt={d.name} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
        {!isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <span className="text-5xl">{fileIcon(ext)}</span>
            <p className="text-[12px] text-[#6b6050]">
              {isWord ? 'Vista previa no disponible para Word.' : `Formato ${ext.toUpperCase()} no tiene previsualización.`}
            </p>
            <p className="text-[10px] text-[#3a3630]">Descarga el archivo para abrirlo.</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border-t border-[#2e2b20] px-4 py-3 space-y-2 flex-shrink-0 bg-[#1e1c16]">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <MetaRow label="Tipo">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIPO_STYLE[tipo] ?? TIPO_STYLE.Otro}`}>{tipo}</span>
          </MetaRow>
          <MetaRow label="Estado">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLE[status] ?? STATUS_STYLE.Borrador}`}>{status}</span>
          </MetaRow>
          <MetaRow label="Caso">
            <span className="text-[#c8c0ac] truncate">{caseDoc?.title ?? '—'}</span>
          </MetaRow>
          <MetaRow label="Cliente">
            <span className="text-[#c8c0ac] truncate">{client?.name ?? caseDoc?.client ?? '—'}</span>
          </MetaRow>
          <MetaRow label="Fuente">
            <span className="text-[#6b6050]">{d.source === 'generated' ? 'Generado' : 'Subido'}</span>
          </MetaRow>
          <MetaRow label="Fecha">
            <span className="text-[#6b6050]">{formatDate(d.createdAt)}</span>
          </MetaRow>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-[#2e2b20] px-4 py-3 flex flex-col gap-2 flex-shrink-0">
        {/* Download row */}
        <div className="flex gap-2">
          {d.pdfDownloadUrl ? (
            <>
              <a href={d.downloadUrl} download={d.name} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="BtnGhost" size="sm" fullWidth>Word</Button>
              </a>
              <a href={d.pdfDownloadUrl} download target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="BtnGold" size="sm" fullWidth>PDF</Button>
              </a>
            </>
          ) : (
            <a href={d.downloadUrl} download={d.name} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="BtnGold" size="sm" fullWidth>Descargar</Button>
            </a>
          )}
          {isPdf && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="BtnGhost" size="sm">↗</Button>
            </a>
          )}
        </div>
        {/* Other actions */}
        <div className="flex gap-2">
          <Button variant="BtnOutlineDark" size="sm" fullWidth onClick={() => onAction('link-case', d)}>Vincular caso</Button>
          <Button variant="BtnOutlineDark" size="sm" fullWidth onClick={() => onAction('analyze', d)}>Analizar con IA</Button>
        </div>
        <button onClick={() => onAction('delete', d)} className="text-[11px] text-[#3a3630] hover:text-red-400 transition-colors text-center pt-1">
          Eliminar documento
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#3a3630] uppercase tracking-widest font-semibold text-[9px] mb-0.5">{label}</p>
      <div className="truncate">{children}</div>
    </div>
  );
}
