'use client';

// Result of an NDA legal check (F2 step 2): traffic light, findings with the NDA excerpt, the official
// source and a suggested clause; "Generar versión actualizada" opens /tools/nda with the fixes.

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { formatContractDate } from '@/lib/contracts/dates';
import { VERDICT_LABEL, type CheckFinding, type CheckVerdict } from '@/lib/legal/check';
import { SEVERITY_LABEL } from '@/lib/legal/types';
import type { NdaCheckResult } from '@/lib/legal/check-client';
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';

export const VERDICT_STYLE: Record<CheckVerdict, string> = {
  ok: 'text-success-text border-status-a-tiempo-border bg-success-subtle',
  review: 'text-warning-text border-status-proximo-border bg-warning-subtle',
  outdated: 'text-danger-text border-status-urgente-border bg-danger-subtle',
  no_rules: 'text-text-muted border-border bg-transparent',
};
export const VERDICT_ICON: Record<CheckVerdict, React.ReactNode> = {
  ok: <CircleCheck size={14} className="inline -mt-0.5" aria-hidden />,
  review: <CircleAlert size={14} className="inline -mt-0.5" aria-hidden />,
  outdated: <CircleX size={14} className="inline -mt-0.5" aria-hidden />,
  no_rules: '—',
};

const STATUS_LABEL: Record<CheckFinding['status'], string> = {
  ok: 'Cumple', not_applicable: 'No aplica', missing: 'Falta', conflict: 'Contradice',
};
const STATUS_STYLE: Record<CheckFinding['status'], string> = {
  ok: 'text-success-text', not_applicable: 'text-text-muted', missing: 'text-warning-text', conflict: 'text-danger-text',
};
const SEV_ORDER = { critical: 0, important: 1, recommended: 2 } as const;

export default function NdaCheckSheet({ check, onClose, onRecheck }: { check: NdaCheckResult; onClose: () => void; onRecheck?: () => void }) {
  const bad = check.findings.filter(f => f.status === 'missing' || f.status === 'conflict').sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const good = check.findings.filter(f => f.status === 'ok' || f.status === 'not_applicable');
  const [showGood, setShowGood] = useState(bad.length === 0);

  return (
    <ModalShell title="Revisión de cambios legales" onClose={onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-3 text-caption font-sans">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text truncate">{check.title}</p>
          <span className={`px-2 py-0.5 rounded border text-caption font-medium flex-shrink-0 ${VERDICT_STYLE[check.verdict]}`}>
            {VERDICT_ICON[check.verdict]} {VERDICT_LABEL[check.verdict]}
          </span>
        </div>
        <p className="text-caption text-text-muted">
          Revisado el {formatContractDate(check.ranAt.slice(0, 10))} · {check.findings.length} requisitos
          {check.verdict === 'no_rules' && ' · No hay normas registradas para la ley aplicable de este NDA (de momento: España y UE).'}
        </p>

        {bad.map(f => <Finding key={f.ruleId} f={f} />)}
        {bad.length === 0 && check.verdict !== 'no_rules' && (
          <p className="text-caption text-success-text">No hemos encontrado requisitos pendientes.</p>
        )}

        {good.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowGood(s => !s)} className="text-caption text-text-muted hover:text-text">
              {showGood ? 'Ocultar' : 'Ver'} {good.length} {good.length === 1 ? 'requisito que cumple o no aplica' : 'requisitos que cumple o no aplican'}
            </button>
            {showGood && good.map(f => <Finding key={f.ruleId} f={f} />)}
          </div>
        )}

        <p className="text-caption text-text-muted leading-snug">
          Herramienta de asistencia: no sustituye la revisión de un profesional.
          {check.unvalidatedBaseline && ' Algunos requisitos base están pendientes de validación por un abogado.'}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {bad.length > 0 && (
            <Link href={`/tools/nda?renew=${encodeURIComponent(check.contractId)}&check=${encodeURIComponent(check.id)}`} className="flex-1">
              <Button variant="accent" size="sm" fullWidth>Generar versión actualizada</Button>
            </Link>
          )}
          {onRecheck && <Button variant="secondary" size="sm" onClick={onRecheck}>Volver a revisar</Button>}
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function Finding({ f }: { f: CheckFinding }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border px-3 py-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption text-text-heading leading-snug">
          {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.title} ↗</a> : f.title}
        </p>
        <span className={`text-caption font-medium flex-shrink-0 ${STATUS_STYLE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
      </div>
      <p className="text-caption text-text-muted">{SEVERITY_LABEL[f.severity]}{f.kind === 'change' ? ' · cambio legal' : ' · requisito base'}</p>
      <p className="text-caption text-text leading-snug">{f.explanation}</p>
      {f.excerpt && <p className="text-caption text-text-muted italic border-l-2 border-border pl-2">«{f.excerpt}»</p>}
      {f.suggestedClause && (
        <div className="rounded bg-bg px-2 py-1.5 space-y-1">
          <p className="text-label text-text-muted uppercase tracking-widest">Cláusula sugerida</p>
          <p className="text-caption text-text leading-snug">{f.suggestedClause}</p>
          <button onClick={() => { navigator.clipboard?.writeText(f.suggestedClause!).then(() => setCopied(true)).catch(() => {}); }}
            className="text-caption text-accent-text hover:underline">{copied ? 'Copiada' : 'Copiar'}</button>
        </div>
      )}
    </div>
  );
}
