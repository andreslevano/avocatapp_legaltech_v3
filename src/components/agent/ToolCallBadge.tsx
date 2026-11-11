'use client';

import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { sourcesFromToolResult } from './CitationBlock';

// Avocat DS v4 ToolCallBadge — spec: design-system/v4/components/ToolCallBadge.md.
export type ToolStatus = 'running' | 'done' | 'error';

/** Human labels; the tool id stays available as the tooltip. */
const TOOL_LABEL: Record<string, { running: string; done: string }> = {
  buscar_casos:                    { running: 'Buscando en tus casos',     done: 'Casos consultados' },
  buscar_documentos_caso:          { running: 'Leyendo documentos del caso', done: 'Documentos del caso leídos' },
  buscar_normativa_jurisprudencia: { running: 'Buscando normativa y jurisprudencia', done: 'Normativa y jurisprudencia' },
};

interface ToolCallBadgeProps {
  name: string;
  status?: ToolStatus;
  /** JSON result; for buscar_normativa_jurisprudencia the number of sources is shown. */
  result?: string;
}

export default function ToolCallBadge({ name, status = 'done', result }: ToolCallBadgeProps) {
  const label = TOOL_LABEL[name]?.[status === 'running' ? 'running' : 'done'] ?? name;
  const nSources = status === 'done' && name === 'buscar_normativa_jurisprudencia' ? sourcesFromToolResult(result).length : 0;
  return (
    <span
      title={name}
      className={[
        'inline-flex items-center gap-1.5 h-6 px-2 rounded-xs border bg-surface-raised text-caption text-text',
        status === 'error' ? 'border-danger' : 'border-border',
      ].join(' ')}
    >
      {status === 'running' && <Loader2 size={12} className="animate-spin text-accent-text" aria-hidden />}
      {status === 'done' && <Check size={12} className="text-success-text" aria-hidden />}
      {status === 'error' && <CircleAlert size={12} className="text-danger-text" aria-hidden />}
      <span>{label}{status === 'running' ? '…' : ''}</span>
      {nSources > 0 && <span className="text-text-muted">· {nSources} {nSources === 1 ? 'fuente' : 'fuentes'}</span>}
      <span className="sr-only">{status === 'running' ? '(en curso)' : status === 'error' ? '(error)' : '(completado)'}</span>
    </span>
  );
}

/** More than 3 steps collapse into "N pasos · ver detalle". */
export function ToolCallGroup({ calls }: { calls: { name: string; status?: ToolStatus; result?: string }[] }) {
  if (!calls.length) return null;
  if (calls.length <= 3) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {calls.map((tc, i) => <ToolCallBadge key={i} name={tc.name} status={tc.status} result={tc.result} />)}
      </div>
    );
  }
  const running = calls.some(c => c.status === 'running');
  return (
    <details className="group">
      <summary className="inline-flex items-center gap-1.5 h-6 px-2 rounded-xs border border-border bg-surface-raised text-caption text-text cursor-pointer list-none">
        {running ? <Loader2 size={12} className="animate-spin text-accent-text" aria-hidden /> : <Check size={12} className="text-success-text" aria-hidden />}
        {calls.length} pasos · <span className="underline">ver detalle</span>
      </summary>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {calls.map((tc, i) => <ToolCallBadge key={i} name={tc.name} status={tc.status} result={tc.result} />)}
      </div>
    </details>
  );
}
