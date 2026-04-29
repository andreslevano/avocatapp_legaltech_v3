'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getUserDocuments, uploadDocument, formatBytes, type DocumentRecord } from '@/lib/storage-client';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';

const TYPE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', default: '📎',
};

function typeIcon(ext: string): string {
  return TYPE_ICON[ext.toLowerCase()] ?? TYPE_ICON.default;
}

export default function DocumentsPage() {
  const { userDoc } = useAppAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userDoc.uid) return;
    getUserDocuments(userDoc.uid)
      .then(setDocs)
      .catch(err => setError(`Error al cargar documentos: ${err?.message ?? err}`))
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const record = await uploadDocument(userDoc.uid, file);
      setDocs(prev => [record, ...prev]);
    } catch {
      setError('Error al subir el documento. Verifica los permisos de Firebase Storage.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Documentos"
        subtitle={`${docs.length} archivo${docs.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
              className="hidden"
              id="doc-upload"
            />
            <Button
              variant="BtnGold"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Subir documento
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#6b6050] mb-4">No hay documentos subidos aún.</p>
            <Button variant="BtnGold" size="md" onClick={() => fileRef.current?.click()}>
              Subir primer documento
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {docs.map(d => (
              <a
                key={d.id}
                href={d.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-4 hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors group"
              >
                <div className="text-3xl mb-3">{typeIcon(d.type)}</div>
                <p className="text-[13px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] truncate mb-1">
                  {d.name}
                </p>
                <p className="text-[11px] text-[#6b6050]">
                  {d.type.toUpperCase()} · {formatBytes(d.size)}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
