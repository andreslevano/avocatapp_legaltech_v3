'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import {
  formatDate, inferDocType, inferOrigin, statusChip,
  getCaseForDoc, getClientForDoc,
  TIPO_STYLE,
} from './helpers';
import { formatBytes } from '@/lib/storage-client';
import type { DocAction } from './DocTable';
import SignaturePanel from '@/components/signatures/SignaturePanel';
import ContractCard from '@/components/contracts/ContractCard';
import type { Contract } from '@/lib/contracts/types';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { Cloud } from 'lucide-react';

interface Props {
  doc: DocumentRecord;
  cases: CaseDoc[];
  clients: ClientDoc[];
  folderLabel?: string;   // "Mis documentos › …" when folders are enabled
  onClose: () => void;
  onAction: (action: DocAction, doc: DocumentRecord) => void;
  canSign?: boolean;
  /** F0: contract summary / "Analizar como contrato"; opens the confirmation sheet. */
  onContract?: (c: Contract) => void;
}

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export default function DocPreviewPanel({ doc: d, cases, clients, folderLabel, onClose, onAction, canSign = false, onContract }: Props) {
  const caseDoc  = getCaseForDoc(d, cases);
  const client   = getClientForDoc(d, cases, clients);
  const tipo     = inferDocType(d.name);
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
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <FileTypeIcon name={`f.${ext}`} size={24} className="mt-0.5 flex-shrink-0 text-accent-text" />
        <div className="flex-1 min-w-0">
          <p className="text-small font-sans font-semibold text-text-heading truncate" title={d.name}>{d.name}</p>
          <p className="text-caption text-text-muted mt-0.5">{ext.toUpperCase()} · {formatBytes(d.size)}</p>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text p-1 flex-shrink-0 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden min-h-0 bg-bg">
        {isPdf && <iframe src={previewUrl} title={d.name} className="w-full h-full border-0" />}
        {isImage && (
          <div className="flex items-center justify-center h-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.downloadUrl} alt={d.name} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
        {!isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <FileTypeIcon name={`f.${ext}`} size={48} className="text-text-muted" />
            <p className="text-caption text-text-muted">
              {isWord ? 'Vista previa no disponible para Word.' : `Formato ${ext.toUpperCase()} no tiene previsualización.`}
            </p>
            <p className="text-caption text-text-muted">Descarga el archivo para abrirlo.</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border-t border-border px-4 py-3 space-y-2 flex-shrink-0 bg-surface">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-caption">
          <MetaRow label="Tipo">
            <span className={`px-1.5 py-0.5 rounded text-caption font-medium border ${TIPO_STYLE[tipo] ?? TIPO_STYLE.Otro}`}>{tipo}</span>
          </MetaRow>
          <MetaRow label="Estado">
            <span className={`px-1.5 py-0.5 rounded text-caption font-medium border ${statusChip(d).className}`}>{statusChip(d).label}</span>
          </MetaRow>
          <MetaRow label="Caso">
            <span className="text-text truncate">{caseDoc?.title ?? '—'}</span>
          </MetaRow>
          <MetaRow label="Cliente">
            <span className="text-text truncate">{client?.name ?? caseDoc?.client ?? '—'}</span>
          </MetaRow>
          <MetaRow label="Origen">
            <span className="text-text-muted">{inferOrigin(d)}</span>
          </MetaRow>
          <MetaRow label="Fecha">
            <span className="text-text-muted">{formatDate(d.createdAt)}</span>
          </MetaRow>
        </div>
        {d.externalRef && (
          <div className="rounded-lg border border-status-en-revision-border bg-info-subtle px-2.5 py-2 space-y-0.5 text-caption">
            <p className="text-info-text">
              <Cloud size={14} className="inline -mt-0.5" aria-hidden /> Importado de {d.externalRef.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'}
              {d.externalRef.importedAt ? ` · ${formatDate(d.externalRef.importedAt)}` : ''}
            </p>
            {d.externalRef.path && <p className="text-text truncate" title={d.externalRef.path}>{d.externalRef.path}</p>}
            {d.externalRef.webUrl && (
              <a href={d.externalRef.webUrl} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
                Abrir en {d.externalRef.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} ↗
              </a>
            )}
            <p className="text-caption text-text-muted">Avocat guarda una copia. Los cambios en el original no se reflejan automáticamente.</p>
          </div>
        )}
        {folderLabel && (
          <div className="text-caption">
            <MetaRow label="Carpeta">
              <button onClick={() => onAction('move', d)} title="Mover a…"
                className="text-text-muted hover:text-accent-text truncate max-w-full text-left transition-colors">{folderLabel}</button>
            </MetaRow>
          </div>
        )}
      </div>

      {onContract && d.kind !== 'certificate' && !d.signedFromDocumentId && <ContractCard documentId={d.id} documentType={d.type} onOpenSheet={onContract} />}

      {d.signatureRequestId && <SignaturePanel requestId={d.signatureRequestId} />}

      {/* Actions */}
      <div className="border-t border-border px-4 py-3 flex flex-col gap-2 flex-shrink-0">
        {canSign && (
          <Button variant="accent" size="sm" fullWidth onClick={() => onAction('sign', d)}>Firmar y enviar</Button>
        )}
        {/* Download row */}
        <div className="flex gap-2">
          {d.pdfDownloadUrl ? (
            <>
              <a href={d.downloadUrl} download={d.name} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="ghost" size="sm" fullWidth>Word</Button>
              </a>
              <a href={d.pdfDownloadUrl} download target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="accent" size="sm" fullWidth>PDF</Button>
              </a>
            </>
          ) : (
            <a href={d.downloadUrl} download={d.name} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="accent" size="sm" fullWidth>Descargar</Button>
            </a>
          )}
          {isPdf && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">↗</Button>
            </a>
          )}
        </div>
        {/* Other actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={() => onAction('link-case', d)}>Vincular caso</Button>
          <Button variant="secondary" size="sm" fullWidth onClick={() => onAction('analyze', d)}>Analizar con IA</Button>
        </div>
        <button onClick={() => onAction('delete', d)} className="text-caption text-text-muted hover:text-danger-text transition-colors text-center pt-1">
          Eliminar documento
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-text-muted uppercase tracking-widest font-semibold text-label mb-0.5">{label}</p>
      <div className="truncate">{children}</div>
    </div>
  );
}
