'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import AgentContextChips from './AgentContextChips';

interface Chip {
  label: string;
  onRemove?: () => void;
}

interface AgentInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  chips?: Chip[];
  placeholder?: string;
}

export default function AgentInput({
  onSend,
  disabled,
  chips = [],
  placeholder = 'Escribe tu consulta legal...',
}: AgentInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  return (
    <div className="border-t border-[#2e2b20] bg-[#161410]">
      {chips.length > 0 && <AgentContextChips chips={chips} />}

      <div className="flex items-end gap-3 px-4 py-3">
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
          disabled={disabled || !value.trim()}
          aria-label="Enviar mensaje"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-avocat-gold text-white hover:bg-[#a07824] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] text-[#3a3630] pb-2 px-4">
        Avocat puede cometer errores. Verifica la información importante con un profesional.
      </p>
    </div>
  );
}
