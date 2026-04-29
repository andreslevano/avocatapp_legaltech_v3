'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { UserDoc } from '@/lib/auth';
import type { User } from 'firebase/auth';
import AgentMessage, { type Message, type MessageAttachment } from './AgentMessage';
import AgentInput from './AgentInput';
import AgentWelcome, { type CaseContext } from './AgentWelcome';
import { isLegalDocument, buildWordBlob } from '@/lib/agent-export';
import { saveDocumentToStorage, type DocumentRecord } from '@/lib/storage-client';

interface AgentChatProps {
  user: User;
  userDoc: UserDoc;
  caseContext?: CaseContext;
  caseDocuments?: DocumentRecord[];
}

const BINARY_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
};

function isBinaryDoc(att: MessageAttachment): boolean {
  const ext = att.name.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_MIMES.has(att.mimeType) || ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(ext);
}

interface SavedToast {
  name: string;
  url: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Fetch up to 5 case documents from Firebase Storage and return as MessageAttachments
async function fetchCaseDocAttachments(docs: DocumentRecord[]): Promise<MessageAttachment[]> {
  const results: MessageAttachment[] = [];
  for (const doc of docs.slice(0, 5)) {
    try {
      const res = await fetch(doc.downloadUrl);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = doc.type.toLowerCase();
      const mimeType = EXT_MIME[ext] ?? blob.type ?? 'application/octet-stream';
      const base64 = await blobToBase64(blob);
      results.push({ name: doc.name, mimeType, base64 });
    } catch {
      // skip inaccessible docs
    }
  }
  return results;
}

export default function AgentChat({ user, userDoc, caseContext, caseDocuments = [] }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [savedToast, setSavedToast] = useState<SavedToast | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether case docs have already been injected into the first message
  const casDocsInjectedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Reset injection flag when case context changes
  useEffect(() => {
    casDocsInjectedRef.current = false;
  }, [caseContext?.id]);

  function showDocSavedToast(name: string, url: string) {
    setSavedToast({ name, url });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSavedToast(null), 5000);
  }

  const sendMessage = useCallback(
    async (text: string, attachments: MessageAttachment[] = []) => {
      if (streaming) return;

      const imageAttachments = attachments.filter(a => a.mimeType.startsWith('image/'));
      const textAttachments  = attachments.filter(a => a.mimeType.startsWith('text/') && a.text);
      const binaryDocs       = attachments.filter(isBinaryDoc);

      let fullMessage = text;
      for (const att of textAttachments) {
        fullMessage += `\n\n[Documento adjunto: ${att.name}]\n${att.text}`;
      }

      // On the first message of a case session, auto-include the case documents
      let injectedCaseDocs: MessageAttachment[] = [];
      if (
        caseContext?.id &&
        caseDocuments.length > 0 &&
        messages.length === 0 &&
        !casDocsInjectedRef.current
      ) {
        casDocsInjectedRef.current = true;
        injectedCaseDocs = await fetchCaseDocAttachments(caseDocuments);
      }

      const allBinaryDocs = [...binaryDocs, ...injectedCaseDocs.filter(isBinaryDoc)];

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text || (attachments.length > 0 ? `[${attachments.map(a => a.name).join(', ')}]` : ''),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      // Save uploaded binary docs to Firebase Storage (fire-and-forget)
      if (binaryDocs.length > 0) {
        Promise.all(
          binaryDocs.map(async att => {
            try {
              const bytes = Uint8Array.from(atob(att.base64), c => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: att.mimeType });
              await saveDocumentToStorage({
                userId: user.uid,
                plan: userDoc.plan ?? '',
                blob,
                name: att.name,
                caseId: caseContext?.id ?? null,
                source: 'uploaded',
              });
            } catch {
              // silent
            }
          })
        ).catch(() => {});
      }

      try {
        const history = messages.map(m => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: fullMessage,
            attachments: imageAttachments.map(({ name, mimeType, base64 }) => ({ name, mimeType, base64 })),
            documents: allBinaryDocs.map(({ name, mimeType, base64 }) => ({ name, mimeType, base64 })),
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
              prev.map(m => m.id === assistantId ? { ...m, content: snapshot } : m)
            );
          }
        }

        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
        );

        // Auto-save legal documents to Firebase Storage
        if (isLegalDocument(accumulated)) {
          try {
            const { blob, filename } = buildWordBlob(accumulated);
            const record = await saveDocumentToStorage({
              userId: user.uid,
              plan: userDoc.plan ?? '',
              blob,
              name: filename,
              caseId: caseContext?.id ?? null,
              source: 'generated',
            });
            showDocSavedToast(filename, record.downloadUrl);
          } catch {
            // silent
          }
        }
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.', streaming: false }
              : m
          )
        );
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, userDoc.plan, caseContext, caseDocuments, user.uid]
  );

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* Document saved toast */}
      {savedToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1e1c16] border border-avocat-gold/40 shadow-lg whitespace-nowrap">
          <span className="text-[13px]">📄</span>
          <span className="text-[12px] text-[#c8c0ac] font-sans">
            Guardado en <strong className="text-[#e8d4a0]">Documentos</strong>
          </span>
          <a
            href={savedToast.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-avocat-gold hover:underline"
          >
            Descargar
          </a>
          <button
            onClick={() => setSavedToast(null)}
            className="text-[#6b6050] hover:text-[#c8c0ac] ml-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showWelcome ? (
        <>
          <AgentWelcome userDoc={userDoc} caseContext={caseContext} onShortcut={sendMessage} />
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
