'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import AgentV2Chat from '@/components/agent/AgentV2Chat';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function AgentV2Content() {
  const { user, userDoc } = useAppAuth();
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId') ?? undefined;

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Agente IA v2"
        subtitle="Claude · herramientas nativas · persistencia"
        actions={
          <Link href="/agent">
            <Button variant="BtnGhost" size="sm">← Agente clásico</Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-hidden">
        <AgentV2Chat user={user} userDoc={userDoc} caseId={caseId} />
      </div>
    </div>
  );
}

export default function AgentV2Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-avocat-gold/30 border-t-avocat-gold rounded-full animate-spin" />
      </div>
    }>
      <AgentV2Content />
    </Suspense>
  );
}
