'use client';

// "Subir copia firmada": the other party signed by hand and sent the document back (reply to the
// handwritten-signature email). The owner uploads it here; it is saved as the signed version of the
// original — same client, case and folder — and the original becomes Firmado.
// Server side: /api/signatures/manual/returned.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Upload } from 'lucide-react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { uploadDocument, type DocumentRecord } from '@/lib/storage-client';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_BYTES = 20 * 1024 * 1024;

export interface SignedCopyResult {
  uploaded: DocumentRecord;
  original: DocumentRecord;
  clientName: string | null;
}

interface Props {
  doc: DocumentRecord;
  onDone?: (r: SignedCopyResult) => void;
  /** Compact button (lists); default is a full-width button (preview panels). */
  compact?: boolean;
}

export default function UploadSignedCopy({ doc, onDone, compact = false }: Props) {
  const { user } = useAppAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; clientId: string | null; clientName: string | null } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return setError('Sube un PDF o una foto (JPG, PNG).');
    if (file.size > MAX_BYTES) return setError('El archivo pesa más de 20 MB.');
    setBusy(true);
    try {
      const uploaded = await uploadDocument(user.uid, file, doc.caseId ?? null, doc.folderId ?? null);
      const token = await user.getIdToken();
      const res = await fetch('/api/signatures/manual/returned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId: doc.id, uploadedDocumentId: uploaded.id }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string; name?: string; clientId?: string | null; clientName?: string | null; signedAt?: string;
      };
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la copia firmada.');
      const result: SignedCopyResult = {
        uploaded: { ...uploaded, name: data.name ?? uploaded.name, kind: 'signed', signedVia: 'manual', signedFromDocumentId: doc.id,
          status: 'Firmado', clientId: data.clientId ?? null, caseId: doc.caseId ?? null, folderId: doc.folderId ?? null },
        original: { ...doc, status: 'Firmado', manualSignature: { ...doc.manualSignature, returnedDocumentId: uploaded.id, returnedAt: data.signedAt } },
        clientName: data.clientName ?? null,
      };
      setDone({ name: result.uploaded.name, clientId: data.clientId ?? null, clientName: data.clientName ?? null });
      onDone?.(result);
    } catch (e) {
      setError((e as Error).message || 'No se pudo subir el archivo.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  if (done) {
    return (
      <div role="status" className="rounded-lg border border-status-a-tiempo-border bg-success-subtle px-3 py-2 text-caption text-text space-y-1">
        <p className="flex items-center gap-1.5 font-semibold text-success-text"><CheckCircle2 size={16} aria-hidden /> Copia firmada guardada</p>
        <p>
          En <strong className="font-semibold">Documentos</strong> como «{done.name}»
          {done.clientName ? <>, vinculada a <strong className="font-semibold">{done.clientName}</strong></> : ''}
          {doc.folderId ? ', en la misma carpeta que el original' : ''}. El documento original queda como Firmado.
        </p>
        {done.clientId && (
          <Link href={`/documents?cliente=${encodeURIComponent(done.clientId)}`} className="text-accent-text underline">Ver los documentos del cliente</Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Opened by the button below (its label says which document); not a second control. */}
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-hidden="true" tabIndex={-1}
        onChange={e => onFile(e.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        className={compact
          ? 'inline-flex items-center gap-1.5 min-h-touch sm:min-h-0 px-2.5 py-1 rounded-md border border-accent-border text-caption font-medium text-accent-text hover:bg-accent-subtle disabled:opacity-50'
          : 'w-full inline-flex items-center justify-center gap-1.5 min-h-touch px-3 py-2 rounded-lg border border-accent-border text-small font-medium text-accent-text hover:bg-accent-subtle disabled:opacity-50'}>
        <Upload size={16} aria-hidden /> {busy ? 'Subiendo…' : 'Subir copia firmada'}
        <span className="sr-only"> de {doc.name}</span>
      </button>
      {!compact && !busy && !error && (
        <p className="text-caption text-text-muted">Cuando la otra parte te la devuelva firmada (PDF o foto).</p>
      )}
      {error && <p role="alert" className="text-caption text-danger-text">{error}</p>}
    </div>
  );
}
