'use client';

import { useState, useRef, useCallback, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react';
import AgentContextChips from './AgentContextChips';
import type { MessageAttachment } from './AgentMessage';

interface Chip {
  label: string;
  onRemove?: () => void;
}

interface AgentInputProps {
  onSend: (message: string, attachments: MessageAttachment[]) => void;
  disabled?: boolean;
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

function fileIcon(mimeType: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType === 'application/pdf' || ext === 'pdf') return '📄';
  if (mimeType.includes('word') || ['docx', 'doc'].includes(ext)) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || ['xlsx', 'xls'].includes(ext)) return '📊';
  return '📎';
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
  chips = [],
  placeholder = 'Escribe tu consulta legal...',
}: AgentInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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
      className={`border-t border-[#2e2b20] bg-[#161410] relative transition-colors ${dragActive ? 'bg-avocat-gold/5 border-avocat-gold/40' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#161410]/90 border-2 border-dashed border-avocat-gold/50 rounded-t-xl pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-avocat-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-[13px] font-sans text-avocat-gold font-medium">Suelta aquí para adjuntar</p>
          <p className="text-[11px] text-[#6b6050]">Imágenes, PDF, Word, Excel</p>
        </div>
      )}

      {chips.length > 0 && <AgentContextChips chips={chips} />}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-2.5">
          {attachments.map((att, i) => (
            <div key={i} className="relative">
              {att.mimeType.startsWith('image/') ? (
                <>
                  <img
                    src={att.preview}
                    alt={att.name}
                    className="h-14 w-14 object-cover rounded-lg border border-[#2e2b20]"
                  />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#161410] border border-[#2e2b20] text-[#6b6050] hover:text-red-400 flex items-center justify-center text-[10px] leading-none"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-avocat-gold/10 border border-avocat-gold/20 text-[11px] font-sans text-avocat-gold max-w-[160px]">
                  <span className="flex-shrink-0">{fileIcon(att.mimeType, att.name)}</span>
                  <span className="truncate">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-avocat-gold/60 hover:text-red-400 text-[12px] leading-none"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* Paperclip */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Adjuntar archivo (imagen, PDF, Word, Excel)"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-[#3a3630] hover:text-[#c8c0ac] hover:bg-[#252218] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors disabled:opacity-50 leading-relaxed min-h-[40px] max-h-[160px]"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-avocat-gold text-white hover:bg-[#a07824] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] text-[#3a3630] pb-2 px-4">
        Arrastra archivos aquí · Pega capturas con Ctrl+V · Avocat puede cometer errores.
      </p>
    </div>
  );
}
