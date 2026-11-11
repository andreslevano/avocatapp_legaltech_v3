'use client';

// /admin/legal-changes — review queue for detected legal changes (F2 step 1, decision L1).
// The AI detects and drafts; an admin edits, approves (→ affected NDAs flagged + owners notified) or
// dismisses. Changes can also be added by hand. Admins only (users.isAdmin, checked server-side too).

import { useEffect, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { addManualChange, reviewChange, runMonitorNow, watchChanges } from '@/lib/legal/client';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BaselineItem } from '@/lib/legal/baseline';
import { formatContractDate } from '@/lib/contracts/dates';
import {
  LEGAL_TOPICS, SEVERITY_LABEL, TOPIC_LABEL,
  type ChangeSeverity, type ChangeStatus, type LegalChange, type LegalJurisdiction, type LegalTopic,
} from '@/lib/legal/types';

const FIELD = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-caption font-sans text-text  focus:border-accent-border';
const LABEL = 'block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1';
type Tab = ChangeStatus | 'baseline';
const TABS: { id: Tab; label: string }[] = [
  { id: 'new', label: 'Pendientes' }, { id: 'approved', label: 'Aprobados' }, { id: 'dismissed', label: 'Descartados' },
  { id: 'baseline', label: 'Requisitos base' },
];
const SEVERITY_STYLE: Record<ChangeSeverity, string> = {
  critical: 'text-danger-text border-status-urgente-border', important: 'text-warning-text border-status-proximo-border', recommended: 'text-text-muted border-border',
};
const SOURCE_LABEL = { boe: 'BOE', eurlex: 'DOUE', manual: 'Manual' } as const;

export default function LegalChangesAdminPage() {
  const { user, userDoc } = useAppAuth();
  const isAdmin = (userDoc as unknown as { isAdmin?: boolean }).isAdmin === true;
  const [tab, setTab] = useState<Tab>('new');
  const [items, setItems] = useState<LegalChange[] | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin || tab === 'baseline') return;
    setItems(null);
    return watchChanges(tab, setItems);
  }, [tab, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Cambios legales" />
        <p className="p-6 text-small text-text-muted">Solo los administradores pueden revisar cambios legales.</p>
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
          <Button variant="ghost" size="sm" onClick={() => setManualOpen(o => !o)}>{manualOpen ? 'Cerrar' : 'Añadir manualmente'}</Button>
          <Button variant="secondary" size="sm" loading={busy === 'search'} disabled={!!busy} onClick={searchNow}>Buscar ahora</Button>
        </>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-caption text-text-muted">
            Avocat revisa cada mañana el BOE (sección I) y la legislación de la UE. La IA propone; nada se usa hasta que lo apruebas.
            Al aprobar, se marcan los NDAs que pueden verse afectados y se avisa a sus titulares.
          </p>
          {manualOpen && <ManualForm onDone={msg => { setManualOpen(false); setTab('new'); setNotice({ kind: 'ok', text: msg }); }} />}

          <div className="flex gap-1 border-b border-border">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-caption -mb-px border-b-2 transition-colors ${tab === t.id ? 'border-accent text-accent-text' : 'border-transparent text-text-muted hover:text-text'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {notice && <p className={`text-caption ${notice.kind === 'ok' ? 'text-success-text' : 'text-danger-text'}`}>{notice.text}</p>}

          {tab === 'baseline' ? <BaselineAdmin onNotice={setNotice} />
            : items === null ? <p className="text-caption text-text-muted">Cargando…</p>
            : items.length === 0 ? (
              <p className="text-caption text-text-muted py-6 text-center">
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
    <div className="bg-surface border border-border rounded-xl px-4 py-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-caption mb-1">
            <span className="px-1.5 py-0.5 rounded border border-border text-text">{SOURCE_LABEL[c.source]} · {c.jurisdiction === 'EU' ? 'UE' : 'España'}</span>
            <span className={`px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[c.severity]}`}>{SEVERITY_LABEL[c.severity]}</span>
            <span className="text-text-muted">Publicado {formatContractDate(c.publishedAt)}{c.effectiveFrom ? ` · en vigor ${formatContractDate(c.effectiveFrom)}` : ''}</span>
            {c.status === 'approved' && <span className="text-success-text">· {c.flaggedContracts ?? 0} NDAs marcados</span>}
          </div>
          <p className="text-small text-text-heading leading-snug">{c.title}</p>
          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-caption text-accent-text hover:underline">Ver texto oficial ↗</a>}
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-caption text-text-muted hover:text-text flex-shrink-0">{open ? 'Ocultar' : 'Ver'}</button>
      </div>

      {open && (
        <div className="space-y-2.5">
          {c.aiTriage?.rationale && <p className="text-caption text-text-muted">IA: {c.aiTriage.rationale}</p>}
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
                {(Object.keys(SEVERITY_LABEL) as ChangeSeverity[]).map(s => <option key={s} value={s} className="bg-bg">{SEVERITY_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Ámbito</label>
              <select className={FIELD} value={jurisdiction} disabled={!editable} onChange={e => setJurisdiction(e.target.value as LegalJurisdiction)}>
                <option value="ES" className="bg-bg">España</option>
                <option value="EU" className="bg-bg">Unión Europea</option>
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
                  className={`px-2 py-1 rounded border text-caption transition-colors ${on ? 'border-accent-border text-accent-text bg-accent-subtle' : 'border-border text-text-muted'} ${editable ? 'hover:text-text' : ''}`}>
                  {TOPIC_LABEL[t]}
                </button>
              );
            })}
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="accent" size="sm" disabled={!!busy} loading={busy === `${c.id}:approve`}
                onClick={() => onRun(`${c.id}:approve`, async () => {
                  const r = await reviewChange(user!, c.id, 'approve', edit());
                  return `Aprobado. ${r.flagged ?? 0} NDAs marcados · ${r.users ?? 0} usuarios avisados.`;
                })}>Aprobar</Button>
              <Button variant="secondary" size="sm" disabled={!!busy} loading={busy === `${c.id}:save`}
                onClick={() => onRun(`${c.id}:save`, async () => { await reviewChange(user!, c.id, 'save', edit()); return 'Cambios guardados.'; })}>Guardar</Button>
              <Button variant="ghost" size="sm" disabled={!!busy} loading={busy === `${c.id}:dismiss`}
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
    <div className="bg-surface border border-accent-border rounded-xl px-4 py-3 space-y-2.5">
      <p className="text-caption text-text">Pega el texto de la norma; la IA prepara el resumen y la cláusula, y queda pendiente de tu aprobación.</p>
      <input className={FIELD} placeholder="Título (p. ej. Ley 2/2023, de 20 de febrero, …)" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
        <input className={FIELD} placeholder="Enlace oficial (opcional)" value={url} onChange={e => setUrl(e.target.value)} />
        <select className={FIELD} value={jurisdiction} onChange={e => setJurisdiction(e.target.value as LegalJurisdiction)}>
          <option value="ES" className="bg-bg">España</option>
          <option value="EU" className="bg-bg">Unión Europea</option>
        </select>
      </div>
      <textarea className={FIELD} rows={6} placeholder="Texto de la norma (o de los artículos relevantes)" value={text} onChange={e => setText(e.target.value)} />
      {error && <p className="text-caption text-danger-text">{error}</p>}
      <Button variant="accent" size="sm" loading={busy} disabled={!title.trim() || text.trim().length < 200} onClick={submit}>
        {busy ? 'Analizando…' : 'Analizar y añadir'}
      </Button>
    </div>
  );
}

/** "Requisitos base" (L2): the key current law every NDA is checked against. Lawyer validation is a tick here. */
function BaselineAdmin({ onNotice }: { onNotice: (n: { kind: 'ok' | 'err'; text: string } | null) => void }) {
  const { user } = useAppAuth();
  const [items, setItems] = useState<BaselineItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'legal_baseline'),
      s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as BaselineItem)).sort((a, b) => a.id.localeCompare(b.id))),
      () => setItems([]));
  }, []);

  const post = async (key: string, body: unknown, ok: string) => {
    if (!user) return;
    setBusy(key); onNotice(null);
    try {
      const res = await fetch('/api/admin/legal-baseline', {
        method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; created?: number };
      if (!res.ok) throw new Error(data.error ?? 'Error');
      onNotice({ kind: 'ok', text: ok.replace('{n}', String(data.created ?? '')) });
    } catch (e) {
      onNotice({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (items === null) return <p className="text-caption text-text-muted">Cargando…</p>;
  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted">
        Cada NDA se revisa frente a estos requisitos además de los cambios aprobados. Son un punto de partida: un abogado debe validarlos
        (mientras no lo estén, los resultados lo indican).
      </p>
      {items.length === 0 ? (
        <Button variant="accent" size="sm" loading={busy === 'seed'} onClick={() => post('seed', { action: 'seed' }, 'Cargados {n} requisitos iniciales.')}>
          Cargar requisitos iniciales
        </Button>
      ) : items.map(b => <BaselineCard key={b.id} b={b} busy={busy} onSave={(patch, msg) => post(b.id, { action: 'save', id: b.id, patch }, msg)} />)}
    </div>
  );
}

function BaselineCard({ b, busy, onSave }: { b: BaselineItem; busy: string | null; onSave: (patch: Record<string, unknown>, msg: string) => void }) {
  const [requirement, setRequirement] = useState(b.requirement);
  const [clause, setClause] = useState(b.suggestedClause ?? '');
  const [severity, setSeverity] = useState<ChangeSeverity>(b.severity);
  const dirty = requirement !== b.requirement || clause !== (b.suggestedClause ?? '') || severity !== b.severity;
  return (
    <div className={`bg-surface border rounded-xl px-4 py-3 space-y-2 ${b.active ? 'border-border' : 'border-border opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-caption">
        <span className="px-1.5 py-0.5 rounded border border-border text-text">{b.jurisdiction === 'EU' ? 'UE' : 'España'}</span>
        <span className={`px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[b.severity]}`}>{SEVERITY_LABEL[b.severity]}</span>
        {b.validatedByLawyer ? <span className="text-success-text">Validado por abogado</span> : <span className="text-warning-text">Pendiente de validación</span>}
        {!b.active && <span className="text-text-muted">· Desactivado</span>}
      </div>
      <p className="text-caption text-text-heading leading-snug">{b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{b.title} ↗</a> : b.title}</p>
      <div>
        <label className={LABEL}>Requisito</label>
        <textarea className={FIELD} rows={2} value={requirement} onChange={e => setRequirement(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Cláusula sugerida</label>
        <textarea className={FIELD} rows={3} value={clause} placeholder="(ninguna)" onChange={e => setClause(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${FIELD} max-w-[160px]`} value={severity} onChange={e => setSeverity(e.target.value as ChangeSeverity)}>
          {(Object.keys(SEVERITY_LABEL) as ChangeSeverity[]).map(s => <option key={s} value={s} className="bg-bg">{SEVERITY_LABEL[s]}</option>)}
        </select>
        {dirty && (
          <Button variant="accent" size="sm" disabled={!!busy} loading={busy === b.id}
            onClick={() => onSave({ requirement, suggestedClause: clause.trim() || null, severity }, 'Requisito guardado.')}>Guardar</Button>
        )}
        <Button variant="secondary" size="sm" disabled={!!busy}
          onClick={() => onSave({ validatedByLawyer: !b.validatedByLawyer }, b.validatedByLawyer ? 'Validación retirada.' : 'Marcado como validado.')}>
          {b.validatedByLawyer ? 'Quitar validación' : 'Marcar como validado'}
        </Button>
        <Button variant="ghost" size="sm" disabled={!!busy}
          onClick={() => onSave({ active: !b.active }, b.active ? 'Requisito desactivado.' : 'Requisito activado.')}>
          {b.active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    </div>
  );
}
