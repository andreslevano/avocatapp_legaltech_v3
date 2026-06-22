'use client';

import { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserDoc } from '@/lib/auth';
import AgentMessage, { type Message } from './AgentMessage';
import ToolCallBadge from './ToolCallBadge';

interface AgentV2ChatProps {
  user: User;
  userDoc: UserDoc;
  caseId?: string;
}

let msgSeq = 0;
function nextId() { return `msg-${++msgSeq}`; }

export default function AgentV2Chat({ user, userDoc, caseId }: AgentV2ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    // Add user message
    const userMsg: Message = { id: nextId(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder assistant message (will be updated as SSE arrives)
    const assistantId = nextId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      toolCalls: [],
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming(true);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/agent-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: text, caseId, convId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          switch (event.type) {
            case 'text':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (event.delta as string) }
                    : m,
                ),
              );
              break;

            case 'tool_start':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls ?? []),
                          { name: event.name as string, status: 'running' as const },
                        ],
                      }
                    : m,
                ),
              );
              break;

            case 'tool_end':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls ?? []).map(tc =>
                          tc.name === (event.name as string) && tc.status === 'running'
                            ? { ...tc, status: 'done' as const }
                            : tc,
                        ),
                      }
                    : m,
                ),
              );
              break;

            case 'done':
              if (event.convId) setConvId(event.convId as string);
              break;

            case 'error':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content || `Error: ${event.message}`, streaming: false }
                    : m,
                ),
              );
              break;
          }
        }
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error de conexión: ${(err as Error).message}`, streaming: false }
            : m,
        ),
      );
    } finally {
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const planLabel = userDoc.plan ?? 'Autoservicio';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#2e2b20] bg-[#161410]">
        <div className="w-7 h-7 rounded-full bg-avocat-gold/20 border border-avocat-gold/30 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-avocat-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-sans font-semibold text-[#e8d4a0] leading-none">
            Avocat IA <span className="text-[10px] font-sans font-normal text-avocat-gold bg-avocat-gold/10 border border-avocat-gold/20 px-1.5 py-0.5 rounded-full ml-1.5 align-middle">v2 · Claude</span>
          </p>
          <p className="text-[11px] font-sans text-[#6b6050] mt-0.5">{planLabel}</p>
        </div>
        {convId && (
          <span className="text-[10px] font-sans text-[#3a3630]">conv {convId.slice(-6)}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-12 h-12 rounded-full bg-avocat-gold/10 border border-avocat-gold/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-avocat-gold">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-sans font-semibold text-[#c8c0ac]">Agente jurídico con herramientas</p>
              <p className="text-[12px] text-[#6b6050] mt-1 max-w-xs leading-relaxed">
                Puedo buscar tus casos y documentos en Firestore. Prueba: "¿Cuáles son mis casos activos?"
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                '¿Cuáles son mis casos activos?',
                'Busca el caso de Juan García',
                '¿Qué documentos tiene mi caso de demanda?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-[#1e1c16] border border-[#2e2b20] text-[#9a9a9a] hover:text-avocat-gold hover:border-avocat-gold/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <AgentMessage key={msg.id} message={msg} />
        ))}

        {/* Tool badges shown inline with streaming message are handled inside AgentMessage */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2e2b20] bg-[#161410] p-3">
        <div className="flex gap-2 items-end bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-3 py-2.5 focus-within:border-avocat-gold/40 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta jurídica… (Enter para enviar)"
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-avocat-gold disabled:opacity-30 flex items-center justify-center transition-opacity hover:bg-avocat-gold/90"
            aria-label="Enviar"
          >
            {streaming ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          {[
            { icon: '⚡', label: 'buscar_casos' },
            { icon: '⚡', label: 'buscar_documentos_caso' },
            { icon: '⚡', label: 'buscar_normativa_jurisprudencia' },
          ].map(t => (
            <ToolCallBadge key={t.label} name={t.label} />
          ))}
          <span className="text-[10px] text-[#3a3630] ml-1">herramientas disponibles</span>
        </div>
      </div>
    </div>
  );
}
