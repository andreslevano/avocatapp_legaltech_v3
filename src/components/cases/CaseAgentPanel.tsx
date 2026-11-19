'use client';

// Case detail › "Conversaciones con IA": the agent chat inside the case (no navigation), with the
// case's previous conversations on the side. Agent v2 conversations can be continued; older ones
// (legacy store) are shown and a new message starts a new conversation.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import type { User } from 'firebase/auth';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import AgentChat from '@/components/agent/AgentChat';
import type { Message } from '@/components/agent/AgentMessage';
import type { UserDoc } from '@/lib/auth';
import { getConversations, type CaseDoc, type ConversationDoc } from '@/lib/firestore';
import type { DocumentRecord } from '@/lib/storage-client';

export interface CaseAgentPanelHandle {
  /** New conversation with this text in the box (e.g. a next step's question). */
  ask: (text: string) => void;
  /** New, empty conversation. */
  startNew: () => void;
}

interface Props {
  user: User;
  userDoc: UserDoc;
  caseDoc: CaseDoc;
  caseDocs: DocumentRecord[];
}

const when = (ts: unknown) => {
  const s = (ts as { seconds?: number } | null)?.seconds;
  return s ? new Date(s * 1000).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

const toMessages = (c: ConversationDoc): Message[] =>
  (c.messages ?? []).filter(m => m.content?.trim()).map((m, i) => ({ id: `${c.id}-${i}`, role: m.role, content: m.content }));

const titleOf = (c: ConversationDoc) =>
  (c.title || c.messages?.find(m => m.role === 'user')?.content || 'Conversación').replace(/\s+/g, ' ').slice(0, 80);

const CaseAgentPanel = forwardRef<CaseAgentPanelHandle, Props>(function CaseAgentPanel({ user, userDoc, caseDoc, caseDocs }, ref) {
  const [convs, setConvs] = useState<ConversationDoc[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);   // conversation shown (null = new)
  const [chat, setChat] = useState<{ key: string; conv: ConversationDoc | null; prefill: { key: number; text: string } | null }>(
    { key: 'new-0', conv: null, prefill: null });

  const load = useCallback(() => getConversations(userDoc.uid, caseDoc.id).then(setConvs).catch(() => setConvs([])), [userDoc.uid, caseDoc.id]);
  useEffect(() => { load(); }, [load]);

  const startNew = useCallback((text?: string) => {
    setSelected(null);
    setChat({ key: `new-${Date.now()}`, conv: null, prefill: text ? { key: Date.now(), text } : null });
  }, []);
  useImperativeHandle(ref, () => ({ ask: text => startNew(text), startNew: () => startNew() }), [startNew]);

  const open = (c: ConversationDoc) => {
    setSelected(c.id);
    setChat({ key: c.id, conv: c, prefill: null });
  };

  // A turn was saved: refresh the list and mark the conversation as selected, without remounting the chat.
  const onConversation = useCallback((convId: string) => { setSelected(convId); load(); }, [load]);

  const caseContext = { id: caseDoc.id, title: caseDoc.title, type: caseDoc.type, client: caseDoc.client, notes: caseDoc.notes };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] min-h-0">
      <nav aria-label="Conversaciones del caso" className="border-b md:border-b-0 md:border-r border-border p-2 space-y-1 max-h-48 md:max-h-none overflow-y-auto">
        <button type="button" onClick={() => startNew()} aria-current={selected === null ? 'true' : undefined}
          className={`w-full min-h-touch flex items-center gap-2 px-3 py-2 rounded-lg text-small font-medium ${selected === null ? 'bg-accent-subtle text-text' : 'text-accent-text hover:bg-surface-muted'}`}>
          <MessageSquarePlus size={16} aria-hidden /> Nueva conversación
        </button>
        {convs === null ? (
          <p className="px-3 py-2 text-caption text-text-muted">Cargando…</p>
        ) : convs.length === 0 ? (
          <p className="px-3 py-2 text-caption text-text-muted">Aún no hay conversaciones en este caso.</p>
        ) : convs.map(c => (
          <button key={c.id} type="button" onClick={() => open(c)} aria-current={selected === c.id ? 'true' : undefined}
            className={`w-full text-left min-h-touch px-3 py-2 rounded-lg ${selected === c.id ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}>
            <span className="flex items-start gap-2">
              <MessagesSquare size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-text-muted" />
              <span className="min-w-0">
                <span className="block text-caption text-text line-clamp-2">{titleOf(c)}</span>
                <span className="block text-caption text-text-muted">{when(c.updatedAt)} · {c.messages.length} mensaje{c.messages.length === 1 ? '' : 's'}</span>
              </span>
            </span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col h-[70vh] min-h-[520px] min-w-0">
        {chat.conv && !chat.conv.resumable && (
          <p className="px-4 py-2 border-b border-border text-caption text-text-muted">
            Conversación anterior. Si escribes, se empezará una conversación nueva con el contexto del caso.
          </p>
        )}
        <AgentChat
          key={chat.key}
          user={user}
          userDoc={userDoc}
          caseContext={caseContext}
          caseDocuments={caseDocs}
          initialConversation={chat.conv ? { id: chat.conv.resumable ? chat.conv.id : null, messages: toMessages(chat.conv) } : undefined}
          onConversation={onConversation}
          prefill={chat.prefill}
        />
      </div>
    </div>
  );
});

export default CaseAgentPanel;
