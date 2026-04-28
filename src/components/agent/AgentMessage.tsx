'use client';

import ToolCallBadge from './ToolCallBadge';
import { downloadAsWord, downloadAsPdf } from '@/lib/agent-export';

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
  toolCalls?: { name: string; status?: 'running' | 'done' }[];
  streaming?: boolean;
}

function fileIcon(mimeType: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType === 'application/pdf' || ext === 'pdf') return '📄';
  if (mimeType.includes('word') || ['docx', 'doc'].includes(ext)) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || ['xlsx', 'xls'].includes(ext)) return '📊';
  return '📎';
}

// Show Word/PDF only when the assistant response looks like a generated legal document
function isLegalDocument(content: string): boolean {
  if (content.length < 400) return false;
  // Markdown headings
  if (/^#{1,3}\s.+/m.test(content)) return true;
  // Multiple bold headings (document sections)
  if ((content.match(/\*\*[^*]{5,60}\*\*/g) ?? []).length >= 3) return true;
  // Spanish legal section keywords in CAPS
  if (/^(PRIMERO|SEGUNDO|TERCERO|HECHOS|FUNDAMENTOS|PETICIÓN|SUPLICO|ANTECEDENTES|OBJETO|CONSIDERANDO|AL JUZGADO|AL TRIBUNAL|DEMANDA|CONTRATO|ACUERDO|CARTA)\b/m.test(content)) return true;
  // ALL-CAPS lines typical of legal document titles
  if ((content.match(/^[A-ZÁÉÍÓÚÜÑ\s]{8,50}$/gm) ?? []).length >= 2) return true;
  return false;
}

export default function AgentMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isDone = !message.streaming;
  const showCopy = !isUser && isDone && message.content.length > 20;
  const showDoc  = !isUser && isDone && isLegalDocument(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-avocat-gold/20 border border-avocat-gold/30 flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-avocat-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        {/* Tool call badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} status={tc.status} />
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
                  className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-avocat-gold/20"
                />
              ) : (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-avocat-gold/10 border border-avocat-gold/20 text-[11px] font-sans text-avocat-gold max-w-[180px]">
                  <span className="flex-shrink-0">{fileIcon(att.mimeType, att.name)}</span>
                  <span className="truncate">{att.name}</span>
                </span>
              )
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className={[
          'rounded-2xl px-4 py-2.5 text-[13px] font-sans leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-avocat-gold text-white rounded-tr-sm'
            : 'bg-[#252218] border border-[#2e2b20] text-[#c8c0ac] rounded-tl-sm',
        ].join(' ')}>
          {message.content}
          {message.streaming && (
            <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>

        {/* Action row below assistant messages */}
        {(showCopy || showDoc) && (
          <div className="flex gap-1.5 mt-1.5">
            {/* Word + PDF only for generated documents */}
            {showDoc && (
              <>
                <button
                  onClick={() => downloadAsWord(message.content)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e1c16] border border-[#2e2b20] text-[11px] font-sans text-[#6b6050] hover:text-avocat-gold hover:border-avocat-gold/30 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Word
                </button>
                <button
                  onClick={() => downloadAsPdf(message.content)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e1c16] border border-[#2e2b20] text-[11px] font-sans text-[#6b6050] hover:text-avocat-gold hover:border-avocat-gold/30 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  PDF
                </button>
              </>
            )}
            {/* Copy always shown */}
            {showCopy && (
              <button
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e1c16] border border-[#2e2b20] text-[11px] font-sans text-[#6b6050] hover:text-avocat-gold hover:border-avocat-gold/30 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copiar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
