'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { UserDoc } from '@/lib/auth';
import type { User } from 'firebase/auth';
import AgentMessage, { type Message, type MessageAttachment } from './AgentMessage';
import AgentInput from './AgentInput';
import AgentWelcome, { type CaseContext } from './AgentWelcome';
import { isLegalDocument, buildWordBlob, buildPdfBlob } from '@/lib/agent-export';
import { saveDocumentToStorage, type DocumentRecord } from '@/lib/storage-client';
import { canUseDocusign } from '@/lib/docusign/config';
import SignDocumentSheet from '@/components/signatures/SignDocumentSheet';
import { FileText } from 'lucide-react';

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

function isBinaryDoc(att: MessageAttachment): boolean {
  const ext = att.name.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_MIMES.has(att.mimeType) || ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(ext);
}

interface SavedToast {
  name: string;
  url: string;
  doc: DocumentRecord;
}


export default function AgentChat({ user, userDoc, caseContext, caseDocuments = [] }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [savedToast, setSavedToast] = useState<SavedToast | null>(null);
  const [signDoc, setSignDoc] = useState<DocumentRecord | null>(null);
  const docusignOn = canUseDocusign(userDoc.plan, user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convIdRef = useRef<string | null>(null);
  // "Detener": aborts the request (the server stops the model) and puts the prompt back to edit.
  const abortRef = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState<{ key: number; text: string; attachments: MessageAttachment[] } | null>(null);
  const stop = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Reset conversation when case changes
  useEffect(() => {
    convIdRef.current = null;
  }, [caseContext?.id]);

  function showDocSavedToast(name: string, url: string, doc: DocumentRecord) {
    setSavedToast({ name, url, doc });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSavedToast(null), docusignOn ? 10000 : 5000);
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
      for (const img of imageAttachments) {
        fullMessage += `\n[Imagen adjunta: ${img.name}]`;
      }

      // Binary docs explicitly uploaded by the user in this message
      const allBinaryDocs = binaryDocs;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text || (attachments.length > 0 ? `[${attachments.map(a => a.name).join(', ')}]` : ''),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
        toolCalls: [],
      };

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

      const ac = new AbortController();
      abortRef.current = ac;
      let accumulated = '';
      try {
        const idToken = await user.getIdToken();

        // Call Cloud Run directly to bypass Firebase Hosting's ~60s proxy timeout.
        // NEXT_PUBLIC_CLOUD_RUN_URL is baked into the bundle at build time.
        const agentUrl = process.env.NEXT_PUBLIC_CLOUD_RUN_URL
          ? `${process.env.NEXT_PUBLIC_CLOUD_RUN_URL}/api/agent-v2`
          : '/api/agent-v2';
        const res = await fetch(agentUrl, {
          signal: ac.signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            message: fullMessage,
            caseId: caseContext?.id,
            convId: convIdRef.current ?? undefined,
            documents: allBinaryDocs.map(({ name, mimeType, base64 }) => ({ name, mimeType, base64 })),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const parts = sseBuffer.split('\n\n');
            sseBuffer = parts.pop() ?? '';

            for (const part of parts) {
              if (!part.startsWith('data: ')) continue;
              const raw = part.slice(6).trim();
              let ev: Record<string, unknown>;
              try { ev = JSON.parse(raw); } catch { continue; }

              if (ev.type === 'text') {
                accumulated += ev.delta as string;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
                );
              } else if (ev.type === 'tool_start') {
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? {
                    ...m,
                    toolCalls: [...(m.toolCalls ?? []), { name: ev.name as string, status: 'running' as const }],
                  } : m)
                );
              } else if (ev.type === 'tool_end') {
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map(tc =>
                      tc.name === (ev.name as string) && tc.status === 'running'
                        ? { name: tc.name, status: 'done' as const, result: ev.result as string }
                        : tc
                    ),
                  } : m)
                );
              } else if (ev.type === 'done') {
                convIdRef.current = ev.convId as string;
              } else if (ev.type === 'error') {
                // A coded error carries a message meant for the user (e.g. AI provider unavailable).
                const e = new Error(ev.message as string ?? 'Error del servidor') as Error & { userMessage?: string };
                if (ev.code) e.userMessage = ev.message as string;
                throw e;
              }
            }
          }
        }

        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
        );

        // Auto-save legal documents to Firebase Storage
        if (isLegalDocument(accumulated)) {
          try {
            const { blob, filename } = buildWordBlob(accumulated);
            const pdfBlobResult = await buildPdfBlob(accumulated, filename.replace(/\.[^.]+$/, '')).catch(() => null);
            const record = await saveDocumentToStorage({
              userId: user.uid,
              plan: userDoc.plan ?? '',
              blob,
              name: filename,
              caseId: caseContext?.id ?? null,
              source: 'generated',
              pdfBlob: pdfBlobResult?.blob ?? undefined,
            });
            showDocSavedToast(record.name, record.downloadUrl, record);
            // Trigger vector embedding with the text we already have (fire-and-forget)
            user.getIdToken().then(token =>
              fetch('/api/documents/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ docId: record.id, text: accumulated.slice(0, 12000) }),
              })
            ).catch(() => {});
          } catch {
            // silent
          }
        }
      } catch (err) {
        if (ac.signal.aborted) {
          // Stopped: keep a partial answer (marked), or drop the empty turn; either way the prompt
          // goes back into the box to edit and resend.
          setMessages(prev => accumulated.trim()
            ? prev.map(m => (m.id === assistantId ? { ...m, content: accumulated, streaming: false, stopped: true } : m))
            : prev.filter(m => m.id !== assistantId && m.id !== userMsg.id));
          setDraft({ key: Date.now(), text, attachments });
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: (err as { userMessage?: string })?.userMessage ?? 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.', streaming: false }
                : m
            )
          );
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [messages, streaming, userDoc.plan, caseContext, caseDocuments, user]
  );

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* Document saved toast */}
      {savedToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1e1c16] border border-avocat-gold/40 shadow-lg whitespace-nowrap">
          <FileText size={16} className="text-accent-text" aria-hidden />
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
          {docusignOn && (
            <button onClick={() => { setSignDoc(savedToast.doc); setSavedToast(null); }}
              className="text-[11px] text-avocat-gold hover:underline">
              Firmar y enviar
            </button>
          )}
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

      {signDoc && <SignDocumentSheet doc={signDoc} onClose={() => setSignDoc(null)} />}

      {showWelcome ? (
        <>
          <AgentWelcome userDoc={userDoc} caseContext={caseContext} onShortcut={sendMessage} />
          <AgentInput onSend={sendMessage} disabled={streaming} streaming={streaming} onStop={stop} draft={draft} />
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.map(m => (
              <AgentMessage key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <AgentInput onSend={sendMessage} disabled={streaming} streaming={streaming} onStop={stop} draft={draft} />
        </>
      )}
    </div>
  );
}
