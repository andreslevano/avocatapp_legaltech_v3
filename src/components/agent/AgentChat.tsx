'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { UserDoc } from '@/lib/auth';
import type { User } from 'firebase/auth';
import AgentMessage, { type Message } from './AgentMessage';
import AgentInput from './AgentInput';
import AgentWelcome from './AgentWelcome';

interface AgentChatProps {
  user: User;
  userDoc: UserDoc;
  caseContext?: object;
}

export default function AgentChat({ user: _user, userDoc, caseContext }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
      };

      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      try {
        const history = messages.map(m => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history,
            userPlan: userDoc.plan,
            caseContext: caseContext ?? null,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            const snapshot = accumulated;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: snapshot } : m
              )
            );
          }
        }

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        );
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, userDoc.plan, caseContext]
  );

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {showWelcome ? (
        <>
          <AgentWelcome userDoc={userDoc} onShortcut={sendMessage} />
          <AgentInput onSend={sendMessage} disabled={streaming} />
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.map(m => (
              <AgentMessage key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <AgentInput onSend={sendMessage} disabled={streaming} />
        </>
      )}
    </div>
  );
}
