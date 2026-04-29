'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCase, type CaseDoc } from '@/lib/firestore';
import { getCaseDocuments, type DocumentRecord } from '@/lib/storage-client';
import AppHeader from '@/components/layout/AppHeader';
import AgentChat from '@/components/agent/AgentChat';
import type { CaseContext } from '@/components/agent/AgentWelcome';

const PLAN_SUBTITLE: Record<string, string> = {
  Abogados:    'Modo abogado — IA jurídica profesional',
  Estudiantes: 'Modo estudiante — tutor socrático',
  Autoservicio: 'Modo particular — lenguaje claro',
};

function AgentContent() {
  const { user, userDoc } = useAppAuth();
  const searchParams = useSearchParams();

  const caseId      = searchParams?.get('caseId')     ?? null;
  const caseTitle   = searchParams?.get('caseTitle')  ?? null;
  const caseType    = searchParams?.get('caseType')   ?? null;
  const caseClient  = searchParams?.get('caseClient') ?? null;

  const [caseDoc, setCaseDoc]         = useState<CaseDoc | null>(null);
  const [caseDocs, setCaseDocs]       = useState<DocumentRecord[]>([]);

  useEffect(() => {
    if (!caseId) return;
    getCase(caseId).then(c => {
      if (c && c.userId === userDoc.uid) {
        setCaseDoc(c);
        // Fetch documents stored for this case
        getCaseDocuments(userDoc.uid, c.id).then(setCaseDocs).catch(() => {});
      }
    }).catch(() => {});
  }, [caseId, userDoc.uid]);

  const caseContext: CaseContext | undefined = caseDoc
    ? { id: caseDoc.id, title: caseDoc.title, type: caseDoc.type, client: caseDoc.client, notes: caseDoc.notes }
    : (caseTitle || caseType)
      ? { title: caseTitle ?? undefined, type: caseType ?? undefined, client: caseClient ?? undefined }
      : undefined;

  const activeTitle = caseDoc?.title ?? caseTitle;
  const subtitle = activeTitle
    ? `Caso: ${activeTitle}`
    : PLAN_SUBTITLE[userDoc.plan ?? ''] ?? '';

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Agente IA" subtitle={subtitle} />
      <AgentChat
        user={user}
        userDoc={userDoc}
        caseContext={caseContext}
        caseDocuments={caseDocs}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full">
        <AppHeader title="Agente IA" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
        </div>
      </div>
    }>
      <AgentContent />
    </Suspense>
  );
}
