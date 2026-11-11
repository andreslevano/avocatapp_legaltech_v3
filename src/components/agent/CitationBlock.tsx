'use client';

import { CircleCheck, ExternalLink, TriangleAlert } from 'lucide-react';

// Avocat DS v4 CitationBlock — spec: design-system/v4/components/CitationBlock.md.
// "Localizada" only when the reference resolved against an authoritative index; otherwise "No localizada".
export interface Source {
  n: number;
  title: string;
  /** ECLI / BOE id / article reference. */
  reference?: string;
  quote?: string;
  url?: string;
  /** TODO(ds-v4): set by a server-side verification hook (CENDOJ / BOE lookup). Undefined = not verified. */
  verified?: boolean;
}

export function citeAnchor(messageId: string, n: number) {
  return `cite-${messageId}-${n}`;
}

export default function CitationBlock({ sources, messageId }: { sources: Source[]; messageId: string }) {
  if (!sources.length) return null;
  const unverified = sources.filter(s => !s.verified).length;
  return (
    <section aria-label="Fuentes" className="mt-4 rounded-lg border border-border bg-surface overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-muted text-caption font-medium text-text-muted">
        <span>Fuentes ({sources.length})</span>
        {unverified > 0 && (
          <span className="text-warning-text">
            {unverified === sources.length ? 'Ninguna verificada todavía' : `${unverified} sin verificar`}
          </span>
        )}
      </header>
      <ol>
        {sources.map(s => (
          <li key={s.n} id={citeAnchor(messageId, s.n)} className="grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-3 border-t border-border first:border-t-0 items-start scroll-mt-24">
            <span className="w-6 h-6 rounded-xs grid place-items-center bg-accent-subtle text-accent-text text-label font-bold tracking-normal">{s.n}</span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-text-heading">{s.title}</p>
              {s.reference && <p className="font-mono text-caption text-text-muted break-words">{s.reference}</p>}
              {s.quote && <p className="mt-1 font-document italic text-body-sm text-text line-clamp-3">«{s.quote}»</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {s.verified ? (
                <span className="inline-flex items-center gap-1 text-caption text-success-text"><CircleCheck size={14} aria-hidden /> Localizada</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-caption text-warning-text"><TriangleAlert size={14} aria-hidden /> No localizada</span>
              )}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption text-accent-text underline">
                  Abrir <ExternalLink size={12} aria-hidden /><span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Citation JSON returned by the `buscar_normativa_jurisprudencia` tool → Sources. */
export function sourcesFromToolResult(result: string | undefined): Source[] {
  if (!result) return [];
  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c: { lawName?: string }) => c && c.lawName)
      .map((c: { lawName: string; lawShort?: string; articleNumber?: string; ecli?: string; content?: string; sourceUrl?: string }, i: number) => ({
        n: i + 1,
        title: c.articleNumber ? `${c.lawShort || c.lawName}, ${c.articleNumber}` : c.lawName,
        reference: c.ecli || c.lawName,
        quote: c.content?.slice(0, 280),
        url: c.sourceUrl,
        verified: undefined,
      }));
  } catch {
    return [];
  }
}
