'use client';

// /admin/legal-changes — review queue for detected legal changes (F2 step 1, decision L1).
// The AI detects and drafts; an admin edits, approves (→ affected NDAs flagged + owners notified) or
// dismisses. Changes can also be added by hand. Admins only (users.isAdmin, checked server-side too).

import { useEffect, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { addManualChange, reviewChange, runMonitorNow, watchChanges } from '@/lib/legal/client';
import { formatContractDate } from '@/lib/contracts/dates';
import {
  LEGAL_TOPICS, SEVERITY_LABEL, TOPIC_LABEL,
  type ChangeSeverity, type ChangeStatus, type LegalChange, type LegalJurisdiction, type LegalTopic,
} from '@/lib/legal/types';

const FIELD = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[12px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const LABEL = 'block text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1';
const TABS: { id: ChangeStatus; label: string }[] = [
  { id: 'new', label: 'Pendientes' }, { id: 'approved', label: 'Aprobados' }, { id: 'dismissed', label: 'Descartados' },
];
const SEVERITY_STYLE: Record<ChangeSeverity, string> = {
  critical: 'text-red-400 border-red-400/30', important: 'text-amber-400 border-amber-400/30', recommended: 'text-[#6b6050] border-[#2e2b20]',
};
const SOURCE_LABEL = { boe: 'BOE', eurlex: 'DOUE', manual: 'Manual' } as const;

export default function LegalChangesAdminPage() {
  const { user, userDoc } = useAppAuth();
  const isAdmin = (userDoc as unknown as { isAdmin?: boolean }).isAdmin === true;
  const [tab, setTab] = useState<ChangeStatus>('new');
  const [items, setItems] = useState<LegalChange[] | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setItems(null);
    return watchChanges(tab, setItems);
  }, [tab, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Cambios legales" />
        <p className="p-6 text-[13px] text-[#6b6050]">Solo los administradores pueden revisar cambios legales.</p>
      </div>
    );
  }

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key); setNotice(null);
    try { setNotice({ kind: 'ok', text: await fn() }); }
    catch (e) { setNotice({ kind: 'err', text: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const searchNow = () => run('search', async () => {
    const r = await runMonitorNow(user!);
    return `Revisadas ${r.fetched} publicaciones (${r.fresh} nuevas) · ${r.triagedRelevant} posibles · ${r.created} cambios añadidos`
      + (r.deferred ? ` · ${r.deferred} quedan para la próxima búsqueda` : '')
      + (r.errors.length ? ` · avisos: ${r.errors.slice(0, 2).join('; ')}` : '');
  });

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Cambios legales"
        subtitle="Revisión de cambios normativos detectados (BOE · DOUE)"
        actions={<>
          <Button variant="BtnGhost" size="sm" onClick={() => setManualOpen(o => !o)}>{manualOpen ? 'Cerrar' : 'Añadir manualmente'}</Button>
          <Button variant="BtnOutlineDark" size="sm" loading={busy === 'search'} disabled={!!busy} onClick={searchNow}>Buscar ahora</Button>
        </>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-[11px] text-[#6b6050]">
            Avocat revisa cada mañana el BOE (sección I) y la legislación de la UE. La IA propone; nada se usa hasta que lo apruebas.
            Al aprobar, se marcan los NDAs que pueden verse afectados y se avisa a sus titulares.
          </p>
          {manualOpen && <ManualForm onDone={msg => { setManualOpen(false); setTab('new'); setNotice({ kind: 'ok', text: msg }); }} />}

          <div className="flex gap-1 border-b border-[#2e2b20]">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[12px] -mb-px border-b-2 transition-colors ${tab === t.id ? 'border-avocat-gold text-avocat-gold' : 'border-transparent text-[#6b6050] hover:text-[#c8c0ac]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {notice && <p className={`text-[12px] ${notice.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{notice.text}</p>}

          {items === null ? <p className="text-[12px] text-[#6b6050]">Cargando…</p>
            : items.length === 0 ? (
              <p className="text-[12px] text-[#6b6050] py-6 text-center">
                {tab === 'new' ? 'No hay cambios pendientes de revisar.' : tab === 'approved' ? 'Aún no hay cambios aprobados.' : 'No hay cambios descartados.'}
              </p>
            ) : items.map(c => (
              <ChangeCard key={c.id} c={c} busy={busy} onRun={run} />
            ))}
        </div>
      </div>
    </div>
  );
}

function ChangeCard({ c, busy, onRun }: { c: LegalChange; busy: string | null; onRun: (key: string, fn: () => Promise<string>) => void }) {
  const { user } = useAppAuth();
  const editable = c.status === 'new';
  const [summary, setSummary] = useState(c.summary);
  const [requirement, setRequirement] = useState(c.requirement);
  const [clause, setClause] = useState(c.suggestedClause ?? '');
  const [severity, setSeverity] = useState<ChangeSeverity>(c.severity);
  const [topics, setTopics] = useState<LegalTopic[]>(c.topics ?? []);
  const [effectiveFrom, setEffectiveFrom] = useState(c.effectiveFrom ?? '');
  const [jurisdiction, setJurisdiction] = useState<LegalJurisdiction>(c.jurisdiction);
  const [open, setOpen] = useState(c.status === 'new');

  const edit = () => ({
    summary, requirement, suggestedClause: clause.trim() || null, severity, topics,
    effectiveFrom: effectiveFrom || null, jurisdiction,
  });

  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-4 py-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-1">
            <span className="px-1.5 py-0.5 rounded border border-[#2e2b20] text-[#c8c0ac]">{SOURCE_LABEL[c.source]} · {c.jurisdiction === 'EU' ? 'UE' : 'España'}</span>
            <span className={`px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[c.severity]}`}>{SEVERITY_LABEL[c.severity]}</span>
            <span className="text-[#6b6050]">Publicado {formatContractDate(c.publishedAt)}{c.effectiveFrom ? ` · en vigor ${formatContractDate(c.effectiveFrom)}` : ''}</span>
            {c.status === 'approved' && <span className="text-emerald-400">· {c.flaggedContracts ?? 0} NDAs marcados</span>}
          </div>
          <p className="text-[13px] text-[#e8d4a0] leading-snug">{c.title}</p>
          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-avocat-gold hover:underline">Ver texto oficial ↗</a>}
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-[11px] text-[#6b6050] hover:text-[#c8c0ac] flex-shrink-0">{open ? 'Ocultar' : 'Ver'}</button>
      </div>

      {open && (
        <div className="space-y-2.5">
          {c.aiTriage?.rationale && <p className="text-[11px] text-[#6b6050]">IA: {c.aiTriage.rationale}</p>}
          <div>
            <label className={LABEL}>Qué cambia</label>
            <textarea className={FIELD} rows={3} value={summary} disabled={!editable} onChange={e => setSummary(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Qué debe contener un NDA</label>
            <textarea className={FIELD} rows={2} value={requirement} disabled={!editable} onChange={e => setRequirement(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Cláusula sugerida</label>
            <textarea className={FIELD} rows={3} value={clause} disabled={!editable} placeholder="(opcional)" onChange={e => setClause(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={LABEL}>Gravedad</label>
              <select className={FIELD} value={severity} disabled={!editable} onChange={e => setSeverity(e.target.value as ChangeSeverity)}>
                {(Object.keys(SEVERITY_LABEL) as ChangeSeverity[]).map(s => <option key={s} value={s} className="bg-[#161410]">{SEVERITY_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Ámbito</label>
              <select className={FIELD} value={jurisdiction} disabled={!editable} onChange={e => setJurisdiction(e.target.value as LegalJurisdiction)}>
                <option value="ES" className="bg-[#161410]">España</option>
                <option value="EU" className="bg-[#161410]">Unión Europea</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>En vigor desde</label>
              <input type="date" className={FIELD} value={effectiveFrom} disabled={!editable} onChange={e => setEffectiveFrom(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEGAL_TOPICS.map(t => {
              const on = topics.includes(t);
              return (
                <button key={t} type="button" disabled={!editable} onClick={() => setTopics(ts => on ? ts.filter(x => x !== t) : [...ts, t])}
                  className={`px-2 py-1 rounded border text-[10px] transition-colors ${on ? 'border-avocat-gold/60 text-avocat-gold bg-avocat-gold/10' : 'border-[#2e2b20] text-[#6b6050]'} ${editable ? 'hover:text-[#c8c0ac]' : ''}`}>
                  {TOPIC_LABEL[t]}
                </button>
              );
            })}
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="BtnGold" size="sm" disabled={!!busy} loading={busy === `${c.id}:approve`}
                onClick={() => onRun(`${c.id}:approve`, async () => {
                  const r = await reviewChange(user!, c.id, 'approve', edit());
                  return `Aprobado. ${r.flagged ?? 0} NDAs marcados · ${r.users ?? 0} usuarios avisados.`;
                })}>Aprobar</Button>
              <Button variant="BtnOutlineDark" size="sm" disabled={!!busy} loading={busy === `${c.id}:save`}
                onClick={() => onRun(`${c.id}:save`, async () => { await reviewChange(user!, c.id, 'save', edit()); return 'Cambios guardados.'; })}>Guardar</Button>
              <Button variant="BtnGhost" size="sm" disabled={!!busy} loading={busy === `${c.id}:dismiss`}
                onClick={() => onRun(`${c.id}:dismiss`, async () => { await reviewChange(user!, c.id, 'dismiss'); return 'Descartado.'; })}>Descartar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManualForm({ onDone }: { onDone: (msg: string) => void }) {
  const { user } = useAppAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [jurisdiction, setJurisdiction] = useState<LegalJurisdiction>('ES');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!user) return;
    setBusy(true); setError('');
    try {
      await addManualChange(user, { title: title.trim(), url: url.trim() || undefined, text, jurisdiction });
      onDone('Cambio añadido a Pendientes. Revísalo y apruébalo.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#1e1c16] border border-avocat-gold/20 rounded-xl px-4 py-3 space-y-2.5">
      <p className="text-[12px] text-[#c8c0ac]">Pega el texto de la norma; la IA prepara el resumen y la cláusula, y queda pendiente de tu aprobación.</p>
      <input className={FIELD} placeholder="Título (p. ej. Ley 2/2023, de 20 de febrero, …)" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
        <input className={FIELD} placeholder="Enlace oficial (opcional)" value={url} onChange={e => setUrl(e.target.value)} />
        <select className={FIELD} value={jurisdiction} onChange={e => setJurisdiction(e.target.value as LegalJurisdiction)}>
          <option value="ES" className="bg-[#161410]">España</option>
          <option value="EU" className="bg-[#161410]">Unión Europea</option>
        </select>
      </div>
      <textarea className={FIELD} rows={6} placeholder="Texto de la norma (o de los artículos relevantes)" value={text} onChange={e => setText(e.target.value)} />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <Button variant="BtnGold" size="sm" loading={busy} disabled={!title.trim() || text.trim().length < 200} onClick={submit}>
        {busy ? 'Analizando…' : 'Analizar y añadir'}
      </Button>
    </div>
  );
}
