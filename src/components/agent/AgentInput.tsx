'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
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

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,.txt,.md';

async function readFile(file: File): Promise<MessageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({ name: file.name, mimeType: file.type, base64, preview: dataUrl });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string ?? '';
        resolve({ name: file.name, mimeType: file.type || 'text/plain', base64: btoa(unescape(encodeURIComponent(text))), text });
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const results = await Promise.all(Array.from(files).map(readFile));
    setAttachments(prev => [...prev, ...results]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className="border-t border-[#2e2b20] bg-[#161410]">
      {chips.length > 0 && <AgentContextChips chips={chips} />}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-2.5">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.mimeType.startsWith('image/') ? (
                <div className="relative">
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
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-avocat-gold/10 border border-avocat-gold/20 text-[11px] font-sans text-avocat-gold">
                  📎 {att.name}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="w-4 h-4 flex items-center justify-center text-avocat-gold/60 hover:text-red-400 text-[12px] leading-none"
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
        {/* Paperclip button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Adjuntar archivo"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-[#3a3630] hover:text-[#c8c0ac] hover:bg-[#252218] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4.5 h-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
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
        Avocat puede cometer errores. Verifica la información importante con un profesional.
      </p>
    </div>
  );
}
