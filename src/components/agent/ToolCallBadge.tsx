'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Citation {
  lawName: string;
  lawShort: string;
  articleNumber: string;
  sectionTitle?: string;
  content: string;
  sourceUrl: string;
  sourceType: 'ley' | 'sentencia';
  ecli?: string;
  fecha?: string;
  sala?: string;
  similarity?: number;
}

interface ToolCallBadgeProps {
  name: string;
  status?: 'running' | 'done';
  result?: string; // JSON string — array of Citation when name='buscar_normativa_jurisprudencia'
}

export default function ToolCallBadge({ name, status = 'done', result }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  let citations: Citation[] | null = null;
  if (status === 'done' && result && name === 'buscar_normativa_jurisprudencia') {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].lawName) {
        citations = parsed as Citation[];
      }
    } catch {
      // not citation JSON — ignore
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        onClick={() => citations && setExpanded(e => !e)}
        className={[
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-caption font-sans',
          'bg-surface-raised border border-border text-text',
          citations ? 'cursor-pointer hover:border-accent-border hover:text-accent-text transition-colors' : 'cursor-default',
        ].join(' ')}
      >
        {status === 'running'
          ? <Loader2 size={12} className="animate-spin" aria-hidden />
          : <Check size={12} aria-hidden />}
        {name}
        {citations && (
          <span className="ml-1 text-accent-text">{citations.length} fuentes {expanded ? <ChevronUp size={12} className="inline" aria-hidden /> : <ChevronDown size={12} className="inline" aria-hidden />}</span>
        )}
      </button>

      {expanded && citations && (
        <div className="flex flex-col gap-1.5 mt-0.5 ml-1 max-w-lg">
          {citations.map((c, i) => (
            <a
              key={i}
              href={c.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-lg bg-surface border border-border hover:border-accent-border transition-colors text-left"
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-caption font-sans font-semibold text-accent-text">
                  {c.articleNumber}
                </span>
                <span className="text-caption text-text-muted">{c.lawShort}</span>
                {c.similarity && (
                  <span className="ml-auto text-caption text-text-muted">
                    {Math.round(c.similarity * 100)}%
                  </span>
                )}
              </div>
              {c.sectionTitle && (
                <p className="text-caption text-text-muted mb-0.5">{c.sectionTitle}</p>
              )}
              <p className="text-caption text-text-muted leading-snug line-clamp-2">{c.content}</p>
              {c.ecli && <p className="text-caption text-text-muted mt-0.5">{c.ecli}</p>}
            </a>
          ))}
        </div>
      )}
    </span>
  );
}
