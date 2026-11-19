// NDA negotiation — small pieces shared by the owner page and the public review page.
import { Lock, PencilLine, Scale } from 'lucide-react';
import { LEVEL_LABEL, type ClauseLevel } from '@/lib/negotiations/levels';
import { wordDiff } from '@/lib/negotiations/diff';
import { CLAUSE_STATE_LABEL, NEGOTIATION_STATUS_LABEL, type ClauseState, type NegotiationStatus } from '@/lib/negotiations/types';

const LEVEL_STYLE: Record<ClauseLevel, { cls: string; icon: typeof Lock }> = {
  modificable:    { cls: 'bg-success-subtle text-success-text border-status-a-tiempo-border', icon: PencilLine },
  negociable:     { cls: 'bg-warning-subtle text-warning-text border-status-proximo-border', icon: Scale },
  no_modificable: { cls: 'bg-surface-raised text-text-muted border-border-strong', icon: Lock },
};

/** Icon + word + colour (never colour alone). */
export function LevelBadge({ level }: { level: ClauseLevel }) {
  const s = LEVEL_STYLE[level];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-caption font-medium whitespace-nowrap ${s.cls}`}>
      <Icon size={16} aria-hidden /> {LEVEL_LABEL[level]}
    </span>
  );
}

const STATE_STYLE: Record<ClauseState, string> = {
  pendiente: 'bg-surface-raised text-text-muted border-border',
  aceptada:  'bg-success-subtle text-success-text border-status-a-tiempo-border',
  resuelta:  'bg-success-subtle text-success-text border-status-a-tiempo-border',
  propuesta: 'bg-warning-subtle text-warning-text border-status-proximo-border',
  comentada: 'bg-info-subtle text-info-text border-status-en-revision-border',
};

export function ClauseStateChip({ state }: { state: ClauseState }) {
  return <span className={`inline-flex items-center h-6 px-2 rounded-full border text-caption font-medium whitespace-nowrap ${STATE_STYLE[state]}`}>{CLAUSE_STATE_LABEL[state]}</span>;
}

const NEG_STYLE: Record<NegotiationStatus, string> = {
  en_revision:        'bg-info-subtle text-info-text border-status-en-revision-border',
  cambios_propuestos: 'bg-warning-subtle text-warning-text border-status-proximo-border',
  acordado:           'bg-success-subtle text-success-text border-status-a-tiempo-border',
  cerrada:            'bg-surface-raised text-text-muted border-border',
  revocada:           'bg-surface-raised text-text-muted border-border',
  caducada:           'bg-surface-raised text-text-muted border-border',
};

export function NegotiationStatusChip({ status }: { status: NegotiationStatus }) {
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-caption font-medium whitespace-nowrap ${NEG_STYLE[status]}`}>{NEGOTIATION_STATUS_LABEL[status]}</span>;
}

/** Word diff: removed words struck through, added words underlined (not colour alone). */
export function DiffText({ before, after, className = '' }: { before: string; after: string; className?: string }) {
  const parts = wordDiff(before, after);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) => p.type === 'same' ? <span key={i}>{p.text}</span>
        : p.type === 'del'
          ? <del key={i} className="bg-danger-subtle text-danger-text line-through"><span className="sr-only">[eliminado: </span>{p.text}<span className="sr-only">]</span></del>
          : <ins key={i} className="bg-success-subtle text-success-text underline decoration-2"><span className="sr-only">[añadido: </span>{p.text}<span className="sr-only">]</span></ins>)}
    </p>
  );
}

/** Clause text as the document shows it: paragraphs, "- " bullets, **bold**. Escaped by React. */
export function ClauseText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    /^\*\*[^*]+\*\*$/.test(t) ? <strong key={i} className="font-semibold">{t.slice(2, -2)}</strong> : <span key={i}>{t}</span>);
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every(l => l.startsWith('- '))) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i} className="whitespace-pre-wrap break-words">{inline(b)}</p>;
      })}
    </div>
  );
}
