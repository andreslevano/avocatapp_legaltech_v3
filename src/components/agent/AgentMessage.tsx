'use client';

import ToolCallBadge from './ToolCallBadge';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { Copy, Sparkles } from 'lucide-react';

export interface MessageAttachment {
  name: string;
  mimeType: string;
  base64: string;
  preview?: string;
  text?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
  toolCalls?: { name: string; status?: 'running' | 'done'; result?: string }[];
  streaming?: boolean;
  stopped?: boolean;     // "Detener": answer cut short by the user
}


export default function AgentMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isDone = !message.streaming;
  const showCopy = !isUser && isDone && message.content.length > 20;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
          <Sparkles size={14} className="text-accent-text" aria-hidden />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        {/* Tool call badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} status={tc.status} result={tc.result} />
            ))}
          </div>
        )}

        {/* File attachments on user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1.5 justify-end">
            {message.attachments.map((att, i) =>
              att.mimeType.startsWith('image/') ? (
                <img
                  key={i}
                  src={att.preview ?? `data:${att.mimeType};base64,${att.base64}`}
                  alt={att.name}
                  className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-accent-border"
                />
              ) : (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-subtle border border-accent-border text-caption font-sans text-accent-text max-w-[180px]">
                  <span className="flex-shrink-0"><FileTypeIcon mimeType={att.mimeType} name={att.name} size={14} /></span>
                  <span className="truncate">{att.name}</span>
                </span>
              )
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className={[
          'rounded-2xl px-4 py-2.5 text-small font-sans leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-accent text-text-on-accent rounded-tr-sm'
            : 'bg-surface-raised border border-border text-text rounded-tl-sm',
        ].join(' ')}>
          {message.content}
          {message.streaming && (
            <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>
        {message.stopped && <p className="mt-1 text-caption text-text-muted">Respuesta detenida</p>}

        {/* Copy button */}
        {showCopy && (
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-caption font-sans text-text-muted hover:text-accent-text hover:border-accent-border transition-colors"
            >
              <Copy size={12} className="flex-shrink-0" aria-hidden />
              Copiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
