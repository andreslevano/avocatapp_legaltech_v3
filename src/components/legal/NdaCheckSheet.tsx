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

export const VERDICT_STYLE: Record<CheckVerdict, string> = {
  ok: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  review: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  outdated: 'text-red-400 border-red-400/30 bg-red-400/5',
  no_rules: 'text-[#6b6050] border-[#2e2b20] bg-transparent',
};
export const VERDICT_ICON: Record<CheckVerdict, string> = { ok: '✅', review: '🟡', outdated: '🔴', no_rules: '—' };

const STATUS_LABEL: Record<CheckFinding['status'], string> = {
  ok: 'Cumple', not_applicable: 'No aplica', missing: 'Falta', conflict: 'Contradice',
};
const STATUS_STYLE: Record<CheckFinding['status'], string> = {
  ok: 'text-emerald-400', not_applicable: 'text-[#6b6050]', missing: 'text-amber-400', conflict: 'text-red-400',
};
const SEV_ORDER = { critical: 0, important: 1, recommended: 2 } as const;

export default function NdaCheckSheet({ check, onClose, onRecheck }: { check: NdaCheckResult; onClose: () => void; onRecheck?: () => void }) {
  const bad = check.findings.filter(f => f.status === 'missing' || f.status === 'conflict').sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const good = check.findings.filter(f => f.status === 'ok' || f.status === 'not_applicable');
  const [showGood, setShowGood] = useState(bad.length === 0);

  return (
    <ModalShell title="Revisión de cambios legales" onClose={onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-3 text-[12px] font-sans">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[#c8c0ac] truncate">{check.title}</p>
          <span className={`px-2 py-0.5 rounded border text-[11px] font-medium flex-shrink-0 ${VERDICT_STYLE[check.verdict]}`}>
            {VERDICT_ICON[check.verdict]} {VERDICT_LABEL[check.verdict]}
          </span>
        </div>
        <p className="text-[10px] text-[#6b6050]">
          Revisado el {formatContractDate(check.ranAt.slice(0, 10))} · {check.findings.length} requisitos
          {check.verdict === 'no_rules' && ' · No hay normas registradas para la ley aplicable de este NDA (de momento: España y UE).'}
        </p>

        {bad.map(f => <Finding key={f.ruleId} f={f} />)}
        {bad.length === 0 && check.verdict !== 'no_rules' && (
          <p className="text-[12px] text-emerald-400">No hemos encontrado requisitos pendientes.</p>
        )}

        {good.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowGood(s => !s)} className="text-[11px] text-[#6b6050] hover:text-[#c8c0ac]">
              {showGood ? 'Ocultar' : 'Ver'} {good.length} {good.length === 1 ? 'requisito que cumple o no aplica' : 'requisitos que cumple o no aplican'}
            </button>
            {showGood && good.map(f => <Finding key={f.ruleId} f={f} />)}
          </div>
        )}

        <p className="text-[10px] text-[#3a3630] leading-snug">
          Herramienta de asistencia: no sustituye la revisión de un profesional.
          {check.unvalidatedBaseline && ' Algunos requisitos base están pendientes de validación por un abogado.'}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {bad.length > 0 && (
            <Link href={`/tools/nda?renew=${encodeURIComponent(check.contractId)}&check=${encodeURIComponent(check.id)}`} className="flex-1">
              <Button variant="BtnGold" size="sm" fullWidth>Generar versión actualizada</Button>
            </Link>
          )}
          {onRecheck && <Button variant="BtnOutlineDark" size="sm" onClick={onRecheck}>Volver a revisar</Button>}
          <Button variant="BtnGhost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function Finding({ f }: { f: CheckFinding }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-[#2e2b20] px-3 py-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-[#e8d4a0] leading-snug">
          {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.title} ↗</a> : f.title}
        </p>
        <span className={`text-[10px] font-medium flex-shrink-0 ${STATUS_STYLE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
      </div>
      <p className="text-[10px] text-[#6b6050]">{SEVERITY_LABEL[f.severity]}{f.kind === 'change' ? ' · cambio legal' : ' · requisito base'}</p>
      <p className="text-[12px] text-[#c8c0ac] leading-snug">{f.explanation}</p>
      {f.excerpt && <p className="text-[11px] text-[#6b6050] italic border-l-2 border-[#2e2b20] pl-2">«{f.excerpt}»</p>}
      {f.suggestedClause && (
        <div className="rounded bg-[#161410] px-2 py-1.5 space-y-1">
          <p className="text-[10px] text-[#6b6050] uppercase tracking-widest">Cláusula sugerida</p>
          <p className="text-[11px] text-[#c8c0ac] leading-snug">{f.suggestedClause}</p>
          <button onClick={() => { navigator.clipboard?.writeText(f.suggestedClause!).then(() => setCopied(true)).catch(() => {}); }}
            className="text-[10px] text-avocat-gold hover:underline">{copied ? 'Copiada' : 'Copiar'}</button>
        </div>
      )}
    </div>
  );
}
