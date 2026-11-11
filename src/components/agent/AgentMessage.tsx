'use client';

import { useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, RotateCcw, Sparkles } from 'lucide-react';
import { ToolCallGroup, type ToolStatus } from './ToolCallBadge';
import CitationBlock, { citeAnchor, type Source } from './CitationBlock';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

// Avocat DS v4 AgentMessage — spec: design-system/v4/components/AgentMessage.md.

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
  toolCalls?: { name: string; status?: ToolStatus; result?: string }[];
  /** Sources behind the answer (CitationBlock). Verification is a TODO(ds-v4) server hook. */
  sources?: Source[];
  streaming?: boolean;
  stopped?: boolean;     // "Detener": answer cut short by the user
  /** Failed turn: shown as an inline Alert with "Reintentar" instead of an empty bubble. */
  error?: string;
}

interface AgentMessageProps {
  message: Message;
  /** Failed turn → resend the same prompt. */
  onRetry?: () => void;
  /** Completed answer → ask again. */
  onRegenerate?: () => void;
}

/** `[1]` markers become superscript links to the CitationBlock entry when that source exists. */
function linkCitations(text: string, messageId: string, sources: Source[]): string {
  if (!sources.length) return text;
  const known = new Set(sources.map(s => s.n));
  return text.replace(/\[(\d{1,2})\](?!\(|:)/g, (m, n) => (known.has(Number(n)) ? `[${n}](#${citeAnchor(messageId, Number(n))})` : m));
}

export default function AgentMessage({ message, onRetry, onRegenerate }: AgentMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(78%,640px)] space-y-1.5">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {message.attachments.map((att, i) =>
                att.mimeType.startsWith('image/') ? (
                  <img
                    key={i}
                    src={att.preview ?? `data:${att.mimeType};base64,${att.base64}`}
                    alt={att.name}
                    className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-border"
                  />
                ) : (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-caption text-text max-w-[180px]">
                    <FileTypeIcon mimeType={att.mimeType} name={att.name} size={14} className="flex-shrink-0 text-accent-text" />
                    <span className="truncate">{att.name}</span>
                  </span>
                )
              )}
            </div>
          )}
          {message.content && (
            <div className="rounded-lg rounded-br-xs bg-surface-raised border border-border px-4 py-2 text-text-heading agent-prose whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  const sources = message.sources ?? [];
  const done = !message.streaming;
  const showActions = done && !message.error && message.content.trim().length > 20;

  const components: Components = {
    a: ({ href, children }) => {
      if (href?.startsWith('#cite-')) {
        return <sup><a href={href} aria-label={`Fuente ${String(children)}`}>{children}</a></sup>;
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  };

  return (
    <article
      className="flex gap-3 items-start"
      aria-label="Respuesta de Avocat"
      aria-busy={message.streaming || undefined}
    >
      <div className="w-7 h-7 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-accent-text" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-text-heading mb-1">Avocat</p>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2"><ToolCallGroup calls={message.toolCalls} /></div>
        )}

        {message.error ? (
          <Alert
            tone="danger"
            title="No se pudo completar la respuesta"
            action={onRetry && <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>Reintentar</Button>}
          >
            {message.error}
          </Alert>
        ) : (
          <div className="agent-prose">
            {message.content ? (
              // No raw HTML: react-markdown escapes it by default (no rehype-raw).
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {linkCitations(message.content, message.id, sources)}
              </ReactMarkdown>
            ) : message.streaming ? (
              <p className="text-text-muted">Pensando…</p>
            ) : null}
            {message.streaming && message.content && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse rounded-xs align-middle" aria-hidden />
            )}
          </div>
        )}

        {message.stopped && <p className="mt-1 text-caption text-text-muted">Respuesta detenida</p>}

        {done && sources.length > 0 && <CitationBlock sources={sources} messageId={message.id} />}

        {showActions && (
          <div className="flex flex-wrap gap-1 mt-3">
            <Button
              variant="ghost"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={() => {
                navigator.clipboard.writeText(message.content).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }).catch(() => {});
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            {/* No "Exportar a Word" here: generated documents auto-save to /documents (CLAUDE.md decision 7). */}
            {onRegenerate && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onRegenerate}>Regenerar</Button>
            )}
            {/* TODO(ds-v4): "útil / mejorable" feedback needs a storage endpoint; not wired yet. */}
          </div>
        )}
      </div>
    </article>
  );
}
