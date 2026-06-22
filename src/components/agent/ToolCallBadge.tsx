'use client';

import { useState } from 'react';

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
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans',
          'bg-[#252218] border border-[#2e2b20] text-[#c8c0ac]',
          citations ? 'cursor-pointer hover:border-avocat-gold/30 hover:text-avocat-gold transition-colors' : 'cursor-default',
        ].join(' ')}
      >
        <span className={status === 'running' ? 'animate-pulse' : ''}>⚡</span>
        {name}
        {citations && (
          <span className="ml-1 text-avocat-gold">{citations.length} fuentes {expanded ? '▴' : '▾'}</span>
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
              className="block px-3 py-2 rounded-lg bg-[#1e1c16] border border-[#2e2b20] hover:border-avocat-gold/30 transition-colors text-left"
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[11px] font-sans font-semibold text-avocat-gold">
                  {c.articleNumber}
                </span>
                <span className="text-[10px] text-[#6b6050]">{c.lawShort}</span>
                {c.similarity && (
                  <span className="ml-auto text-[10px] text-[#3a3630]">
                    {Math.round(c.similarity * 100)}%
                  </span>
                )}
              </div>
              {c.sectionTitle && (
                <p className="text-[10px] text-[#6b6050] mb-0.5">{c.sectionTitle}</p>
              )}
              <p className="text-[11px] text-[#9a9a9a] leading-snug line-clamp-2">{c.content}</p>
              {c.ecli && <p className="text-[10px] text-[#3a3630] mt-0.5">{c.ecli}</p>}
            </a>
          ))}
        </div>
      )}
    </span>
  );
}
