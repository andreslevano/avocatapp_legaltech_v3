'use client';

import { useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { CloudUpload, Loader2, Lock } from 'lucide-react';

// Avocat DS v4 FileDropzone — spec: design-system/v4/components/FileDropzone.md.
// The zone is also a button (drag-and-drop is never the only path) and always carries the privacy note.
interface FileDropzoneProps {
  onFiles: (files: FileList) => void;
  /** input accept attribute */
  accept?: string;
  /** Human text for what is accepted. */
  acceptLabel?: string;
  multiple?: boolean;
  /** Busy state (uploading / OCR) — text is announced politely. */
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  privacy?: boolean;
}

export default function FileDropzone({
  onFiles, accept = '.pdf', acceptLabel = 'PDF · máx. 20 MB', multiple = true,
  busy = false, busyLabel = 'Subiendo archivos…', disabled = false, privacy = true,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled && e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          'rounded-lg border-2 border-dashed p-6 sm:p-8 text-center transition-colors',
          drag ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        {busy ? (
          <div aria-live="polite" className="flex flex-col items-center gap-2 text-body-sm text-text">
            <Loader2 size={28} className="animate-spin text-accent-text" aria-hidden />
            {busyLabel}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <CloudUpload size={28} className="text-accent-text" aria-hidden />
            <p className="text-body-sm text-text">
              <strong className="font-semibold text-text-heading">{drag ? 'Suelta los archivos para subirlos' : 'Arrastra aquí tus documentos o '}</strong>
              {!drag && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="font-semibold text-accent-text underline underline-offset-2"
                >
                  selecciónalos en tu equipo
                </button>
              )}
            </p>
            <p className="text-caption text-text-muted">{acceptLabel}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
        />
      </div>
      {privacy && (
        // TODO(ds-v4): have counsel confirm the privacy wording (Storage encryption at rest, owner-only rules, API no-training terms).
        <p className="flex items-start gap-2 text-caption text-text-muted">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Tus documentos se guardan cifrados y solo los ves tú. No se usan para entrenar modelos.{' '}
            <Link href="/privacidad" className="underline underline-offset-2 text-text">Cómo tratamos tus datos</Link>
          </span>
        </p>
      )}
    </div>
  );
}
