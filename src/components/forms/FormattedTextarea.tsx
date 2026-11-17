'use client';

// A textarea with a formatting toolbar — Negrita, Cursiva, Tamaño (Normal / Subtítulo / Título),
// Viñetas, Lista numerada — for text that goes into generated documents. It writes the markdown subset
// the documents understand (src/lib/doc-html.ts) and shows a live preview with the document's look.
// Text operations: src/lib/text-format.ts.
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { markdownToHtml } from '@/lib/doc-html';
import { applyLineStyle, lineStyleAt, toggleWrap, type Edit, type LineStyle } from '@/lib/text-format';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  help?: string;
  /** Markdown that will actually go into the document (e.g. the NDA's product block). */
  toDocument?: (value: string) => string;
}

const BTN = 'inline-flex items-center justify-center min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 h-8 w-8 rounded-md text-text-muted hover:text-text hover:bg-surface-muted aria-pressed:bg-accent-subtle aria-pressed:text-accent-text';

export default function FormattedTextarea({ id, label, value, onChange, placeholder, rows = 5, help, toDocument }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [style, setStyle] = useState<LineStyle>('normal');

  const sel = () => { const t = ref.current!; return { start: t.selectionStart, end: t.selectionEnd }; };
  // Selection to restore once React has written the new value (synchronously, before anything else
  // can change the selection — a deferred restore could overwrite the user's next selection).
  const pending = useRef<Edit | null>(null);
  useLayoutEffect(() => {
    const e = pending.current, t = ref.current;
    if (!e || !t || t.value !== e.value) return;
    pending.current = null;
    t.focus();
    t.setSelectionRange(e.start, e.end);
    setStyle(lineStyleAt(e.value, e.start));
  }, [value]);
  const commit = (e: Edit) => {
    pending.current = e;
    onChange(e.value);
  };
  const wrap = (m: '**' | '*') => { const { start, end } = sel(); commit(toggleWrap(value, start, end, m)); };
  const line = (s: LineStyle) => { const { start, end } = sel(); commit(applyLineStyle(value, start, end, s)); };
  const track = () => { const t = ref.current; if (t) setStyle(lineStyleAt(value, t.selectionStart)); };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); wrap('**'); }
    if (k === 'i') { e.preventDefault(); wrap('*'); }
  };

  const size = style === 'h2' || style === 'h3' ? style : 'normal';
  const preview = value.trim() ? markdownToHtml(toDocument ? toDocument(value) : value) : '';

  return (
    <div>
      <label htmlFor={id} className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">{label}</label>
      <div className="rounded-lg border border-border bg-bg focus-within:border-accent-border">
        <div role="toolbar" aria-label={`Formato de ${label.replace(/\s*\*$/, '')}`} aria-controls={id}
          className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          <button type="button" className={BTN} onClick={() => wrap('**')} aria-label="Negrita (Ctrl+B)" title="Negrita (Ctrl+B)"><Bold size={16} aria-hidden /></button>
          <button type="button" className={BTN} onClick={() => wrap('*')} aria-label="Cursiva (Ctrl+I)" title="Cursiva (Ctrl+I)"><Italic size={16} aria-hidden /></button>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <label htmlFor={`${id}-size`} className="sr-only">Tamaño</label>
          <select id={`${id}-size`} value={size} onChange={e => line(e.target.value as LineStyle)} title="Tamaño"
            className="h-8 min-h-touch sm:min-h-0 rounded-md bg-bg border border-border text-caption text-text px-2">
            <option value="normal">Normal</option>
            <option value="h3">Subtítulo</option>
            <option value="h2">Título</option>
          </select>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={BTN} aria-pressed={style === 'bullet'} onClick={() => line('bullet')} aria-label="Viñetas" title="Viñetas"><List size={16} aria-hidden /></button>
          <button type="button" className={BTN} aria-pressed={style === 'number'} onClick={() => line('number')} aria-label="Lista numerada" title="Lista numerada"><ListOrdered size={16} aria-hidden /></button>
        </div>
        <textarea ref={ref} id={id} rows={rows} value={value} placeholder={placeholder}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} onKeyUp={track} onClick={track} onSelect={track}
          className="w-full bg-transparent px-4 py-3 text-small font-sans text-text resize-y leading-relaxed rounded-b-lg" />
      </div>
      {help && <p id={`${id}-help`} className="mt-1.5 text-caption text-text-muted">{help}</p>}
      {preview && (
        <div className="mt-3">
          <p className="text-caption text-text-muted mb-1">Así quedará en el documento</p>
          {/* markdownToHtml escapes all text: only the formatting tags it produces reach the DOM. */}
          <div data-theme="light"
            className="legal-doc rounded-lg border border-border !max-w-none !px-6 !py-4 text-body-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_h3]:font-semibold [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      )}
    </div>
  );
}
