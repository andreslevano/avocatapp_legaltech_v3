'use client';

import { useAppAuth } from '@/contexts/AppAuthContext';
import AppHeader from '@/components/layout/AppHeader';
import AgentChat from '@/components/agent/AgentChat';

const PLAN_SUBTITLE: Record<string, string> = {
  Abogados:    'Modo abogado — IA jurídica profesional',
  Estudiantes: 'Modo estudiante — tutor socrático',
  Autoservicio: 'Modo particular — lenguaje claro',
};

export default function AgentPage() {
  const { user, userDoc } = useAppAuth();

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Agente IA"
        subtitle={PLAN_SUBTITLE[userDoc.plan ?? ''] ?? ''}
      />
      <AgentChat user={user} userDoc={userDoc} />
    </div>
  );
}
