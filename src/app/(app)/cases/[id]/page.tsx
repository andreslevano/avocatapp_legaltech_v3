'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCase, getConversations, updateCase, type CaseDoc, type ConversationDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import type { Timestamp } from 'firebase/firestore';

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Activo' },
  { value: 'urgent',   label: 'Urgente' },
  { value: 'closed',   label: 'Cerrado' },
  { value: 'archived', label: 'Archivado' },
] as const;

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  urgent:   'bg-red-500/10 text-red-400 border-red-500/20',
  closed:   'bg-[#252218] text-[#6b6050] border-[#2e2b20]',
  archived: 'bg-[#1a1812] text-[#3a3630] border-[#2e2b20]',
};

const TYPE_LABELS: Record<string, string> = {
  civil:        'Civil',
  laboral:      'Laboral',
  contractual:  'Contractual',
  familia:      'Familia',
  penal:        'Penal',
  sucesoral:    'Sucesoral',
  otro:         'Otro',
};

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateTime(ts: Timestamp): string {
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CaseDetailPage() {
  const { userDoc } = useAppAuth();
  const params = useParams<{ id: string }>() ?? { id: '' };
  const router = useRouter();

  const [caseDoc, setCaseDoc] = useState<CaseDoc | null>(null);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      getCase(params.id),
      getConversations(userDoc.uid, params.id),
    ])
      .then(([c, convs]) => {
        if (!c || c.userId !== userDoc.uid) { setNotFound(true); return; }
        setCaseDoc(c);
        setConversations(convs);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id, userDoc.uid]);

  const handleStatusChange = async (status: string) => {
    if (!caseDoc) return;
    setSaving(true);
    try {
      await updateCase(caseDoc.id, { status: status as CaseDoc['status'] });
      setCaseDoc(prev => prev ? { ...prev, status: status as CaseDoc['status'] } : prev);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Caso" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !caseDoc) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Caso no encontrado" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-[13px] text-[#6b6050]">Este caso no existe o no tienes acceso.</p>
          <Link href="/cases" className="text-avocat-gold text-[13px] hover:underline">← Volver a casos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title={caseDoc.title}
        subtitle={`${caseDoc.ref}${caseDoc.client ? ` · ${caseDoc.client}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/agent?caseId=${caseDoc.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-avocat-gold/10 border border-avocat-gold/20 text-avocat-gold text-[12px] font-sans font-medium hover:bg-avocat-gold/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Consultar con IA
            </Link>
            <button
              onClick={() => router.push('/cases')}
              className="px-3 py-1.5 rounded-lg text-[12px] font-sans text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218] transition-colors"
            >
              ← Casos
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Case info card */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex flex-wrap items-start gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-[20px] text-[#e8d4a0] leading-snug">{caseDoc.title}</h2>
                <p className="text-[12px] text-[#6b6050] mt-1">{caseDoc.ref}</p>
              </div>
              {/* Status selector */}
              <select
                value={caseDoc.status}
                onChange={e => handleStatusChange(e.target.value)}
                disabled={saving}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-sans font-medium border cursor-pointer focus:outline-none ${STATUS_STYLE[caseDoc.status]} bg-transparent`}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#1e1c16] text-[#c8c0ac]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tipo', value: TYPE_LABELS[caseDoc.type] ?? caseDoc.type },
                { label: 'Cliente', value: caseDoc.client || '—' },
                { label: 'Vencimiento', value: formatDate(caseDoc.deadline) },
                { label: 'Actualizado', value: formatDate(caseDoc.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">{label}</p>
                  <p className="text-[13px] text-[#c8c0ac]">{value}</p>
                </div>
              ))}
            </div>

            {caseDoc.notes && (
              <div className="mt-5 pt-5 border-t border-[#2e2b20]">
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">Notas</p>
                <p className="text-[13px] text-[#c8c0ac] whitespace-pre-wrap leading-relaxed">{caseDoc.notes}</p>
              </div>
            )}
          </div>

          {/* Conversations */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2b20] flex items-center justify-between">
              <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">
                Conversaciones con IA
              </h3>
              <span className="text-[11px] text-[#6b6050]">{conversations.length}</span>
            </div>

            {conversations.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px] text-[#6b6050] mb-3">Sin conversaciones registradas para este caso.</p>
                <Link
                  href={`/agent?case=${caseDoc.id}`}
                  className="text-avocat-gold text-[12px] hover:underline"
                >
                  Iniciar consulta con IA →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#2e2b20]">
                {conversations.map(conv => (
                  <div key={conv.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#6b6050]">
                        {conv.messages.length} mensaje{conv.messages.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] text-[#3a3630]">
                        {formatDateTime(conv.updatedAt)}
                      </span>
                    </div>
                    {conv.messages[0] && (
                      <p className="text-[12px] text-[#c8c0ac] line-clamp-2 leading-snug">
                        {conv.messages[0].content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
