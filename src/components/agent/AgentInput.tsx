'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react';
import AgentContextChips from './AgentContextChips';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import type { MessageAttachment } from './AgentMessage';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Paperclip, SendHorizontal, Square, Upload, X } from 'lucide-react';

interface Chip {
  label: string;
  onRemove?: () => void;
}

interface AgentInputProps {
  onSend: (message: string, attachments: MessageAttachment[]) => void;
  disabled?: boolean;
  /** While the agent answers: the send button becomes "Detener". */
  streaming?: boolean;
  onStop?: () => void;
  /** A prompt put back in the box (after "Detener") to edit and resend; `key` changes each time. */
  draft?: { key: number; text: string; attachments: MessageAttachment[] } | null;
  chips?: Chip[];
  placeholder?: string;
}

const ACCEPTED = 'image/*,.pdf,.docx,.doc,.xlsx,.xls,.txt,.md';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  txt: 'text/plain',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function resolveMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

function isBinaryDoc(mimeType: string, name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return (
    ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(ext) ||
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-excel'
  );
}


async function readFile(file: File): Promise<MessageAttachment> {
  const mimeType = resolveMime(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (mimeType.startsWith('image/')) {
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({ name: file.name, mimeType, base64, preview: dataUrl });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (isBinaryDoc(mimeType, file.name)) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        // chunk-based btoa to avoid stack overflow on large files
        let binary = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
        }
        resolve({ name: file.name, mimeType, base64: btoa(binary) });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? '';
        resolve({ name: file.name, mimeType: mimeType || 'text/plain', base64: btoa(unescape(encodeURIComponent(text))), text });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

export default function AgentInput({
  onSend,
  disabled,
  streaming = false,
  onStop,
  draft = null,
  chips = [],
  placeholder = 'Escribe tu consulta legal…',
}: AgentInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // "Detener": the stopped prompt comes back for editing.
  useEffect(() => {
    if (!draft) return;
    setValue(draft.text);
    setAttachments(draft.attachments);
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
      t.style.height = 'auto';
      t.style.height = `${Math.min(t.scrollHeight, 192)}px`;
    });
  }, [draft?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const results = await Promise.all(files.map(readFile));
    setAttachments(prev => [...prev, ...results]);
  }, []);

  const handleSend = () => {
    const text = value.trim();
    if ((!text && attachments.length === 0) || disabled) return;
    onSend(text, attachments);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // Enter sends · Shift+Enter new line · ⌘/Ctrl+Enter also sends. No send while an IME is composing.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    if (!e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
  };

  // Paste: intercept clipboard images (screenshots)
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) addFiles([file]);
    }
  };

  // Drag and drop
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragActive(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div
      className="relative border-t border-border bg-bg px-4 pt-3 pb-2"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="mx-auto max-w-[760px]">
        {/* Drag overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-raised flex flex-col items-center justify-center gap-2 bg-bg border-2 border-dashed border-accent-border pointer-events-none">
            <Upload size={32} className="text-accent-text" aria-hidden />
            <p className="text-small text-accent-text font-medium">Suelta aquí para adjuntar</p>
            <p className="text-caption text-text-muted">Imágenes, PDF, Word, Excel</p>
          </div>
        )}

        {chips.length > 0 && <div className="mb-2"><AgentContextChips chips={chips} /></div>}

        {/* Composer box — the focus ring wraps the whole box (:focus-within) */}
        <div className="rounded-lg border border-border-strong bg-surface transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-focus">
          {attachments.length > 0 && (
            <ul aria-label="Archivos adjuntos" className="flex flex-wrap gap-2 px-3 pt-2.5">
              {attachments.map((att, i) => (
                <li key={i} className="relative">
                  {att.mimeType.startsWith('image/') ? (
                    <>
                      <img src={att.preview} alt={att.name} className="h-14 w-14 object-cover rounded-md border border-border" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Quitar ${att.name}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg border border-border text-text-muted hover:text-danger-text flex items-center justify-center"
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md bg-accent-subtle border border-accent-border text-caption text-accent-text max-w-[200px]">
                      <FileTypeIcon mimeType={att.mimeType} name={att.name} size={14} className="flex-shrink-0" />
                      <span className="truncate">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Quitar ${att.name}`}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:text-danger-text"
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <label htmlFor="agent-composer" className="sr-only">Mensaje para el agente</label>
          <textarea
            id="agent-composer"
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            aria-describedby="agent-composer-hint"
            className="block w-full resize-none bg-transparent px-3 pt-2.5 pb-1 agent-prose text-text outline-none focus-visible:outline-none disabled:opacity-50 min-h-[44px] max-h-[192px]"
          />

          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            <IconButton
              icon={Paperclip}
              label="Adjuntar archivo (imagen, PDF, Word, Excel)"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
              className="hidden"
            />
            <span id="agent-composer-hint" className="hidden sm:inline text-caption text-text-muted ml-1">
              Intro para enviar · Mayús+Intro para nueva línea
            </span>
            <div className="ml-auto">
              {streaming && onStop ? (
                <Button variant="secondary" size="sm" icon={Square} onClick={onStop} title="Detener (podrás editar tu mensaje)">
                  Detener
                </Button>
              ) : (
                <IconButton icon={SendHorizontal} label="Enviar mensaje" variant="accent" size="sm" onClick={handleSend} disabled={!canSend} />
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 text-center space-y-0.5">
          <AIDisclaimer variant="inline" />
          <p className="hidden sm:block text-caption text-text-muted">Arrastra archivos aquí · Pega capturas con Ctrl+V</p>
        </div>
      </div>
    </div>
  );
}
