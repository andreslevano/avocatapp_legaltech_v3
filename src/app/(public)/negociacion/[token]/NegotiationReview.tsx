'use client';

// The other party's review of an NDA draft, clause by clause (mobile-first, light public theme).
// Acepto · Propongo cambio (new wording; reason required on negociable clauses) · Comento.
// No-modificable clauses: Acepto / Comento only. "Enviar propuesta" or "Acepto el borrador completo".
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Hourglass, Link2Off, Lock, MessageSquare, PencilLine, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ClauseStateChip, ClauseText, DiffText, LevelBadge } from '@/components/negotiations/shared';
import { formatContractDate } from '@/lib/contracts/dates';
import { CLAUSE_LEVELS, LEVEL_HELP, type ClauseLevel } from '@/lib/negotiations/levels';
import { CLAUSE_TEXT_MAX, NOTE_MAX } from '@/lib/negotiations/rules';
import type { ClauseComment, ClauseState, OwnerDecision } from '@/lib/negotiations/types';

interface Clause {
  key: string; n: number; heading: string; text: string; state: ClauseState; level?: ClauseLevel;
  canPropose: boolean; reasonRequired: boolean; ownerDecision?: OwnerDecision | null; comments: ClauseComment[];
}
type Closed = 'invalida' | 'caducada' | 'revocada' | 'cerrada' | 'acordado' | 'no_es_tu_turno';
type View =
  | { status: Closed; ownerCompany?: string; title?: string; round?: number }
  | { status: 'abierta'; ownerCompany: string; title: string; round: number; version: number; expiresAt: string; counterpartyName: string; showLevels: boolean; clauses: Clause[] };

type Action = 'acepto' | 'propongo' | 'comento';
interface Local { action?: Action; text: string; reason: string; comment: string }
type Filter = 'pendientes' | 'cambios' | 'todas';

const FIELD = 'w-full px-3 py-2 border border-border-strong rounded-md bg-surface text-body text-text leading-relaxed';
const needsReview = (c: Clause) => c.state === 'pendiente' || c.state === 'propuesta' || c.state === 'comentada';

function StateMessage({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center space-y-3 py-10">
      <Icon size={40} className="mx-auto text-accent-text" aria-hidden />
      <h1 className="font-display text-h2 text-text-heading">{title}</h1>
      <div className="text-body-sm text-text-muted max-w-md mx-auto space-y-2">{children}</div>
    </div>
  );
}

export default function NegotiationReview({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [filter, setFilter] = useState<Filter>('pendientes');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [done, setDone] = useState<{ agreed: boolean; company: string } | null>(null);

  useEffect(() => {
    fetch(`/api/negotiations/public/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((v: View) => {
        setView(v);
        if (v.status === 'abierta') {
          setLocal(Object.fromEntries(v.clauses.map(c => [c.key, { text: c.text, reason: '', comment: '' }])));
          if (!v.clauses.some(needsReview)) setFilter('todas');
        }
      })
      .catch(() => setLoadError(true));
  }, [token]);

  const open = view?.status === 'abierta' ? view : null;
  const clauses = useMemo(() => open?.clauses ?? [], [open]);
  const reviewed = (c: Clause) => !!local[c.key]?.action || !needsReview(c);
  const shown = clauses.filter(c => filter === 'todas' ? true
    // To review in this round (cards stay while you answer them; progress counts what's done).
    : filter === 'pendientes' ? needsReview(c)
    : local[c.key]?.action === 'propongo' || local[c.key]?.action === 'comento' || !!c.ownerDecision || c.comments.length > 0);

  if (loadError) return <Shell><Alert tone="danger" title="No pudimos cargar el borrador">Revisa tu conexión y vuelve a abrir el enlace.</Alert></Shell>;
  if (!view) return <Shell><p className="text-body-sm text-text-muted text-center py-10">Cargando…</p></Shell>;

  if (done) {
    return (
      <Shell>
        <StateMessage icon={CheckCircle2} title={done.agreed ? 'Has aceptado el borrador' : 'Propuesta enviada'}>
          <p>{done.agreed
            ? `${done.company} generará la versión final y te la enviará para firmar.`
            : `${done.company} revisará tus cambios y comentarios. Te llegará un email cuando responda.`}</p>
          <p>Ya puedes cerrar esta página.</p>
        </StateMessage>
      </Shell>
    );
  }
  if (!open) {
    const who = view.ownerCompany ?? 'Quien te lo envió';
    const msg: Record<Closed, { icon: typeof Clock; title: string; body: string }> = {
      no_es_tu_turno: { icon: Hourglass, title: `${who} está revisando tu propuesta`, body: 'Te llegará un email cuando responda. Podrás seguir con este mismo enlace.' },
      acordado: { icon: CheckCircle2, title: 'Borrador acordado', body: `Las dos partes estáis de acuerdo. ${who} te enviará la versión final para firmar.` },
      caducada: { icon: Clock, title: 'Este enlace ha caducado', body: `Pide a ${who} que te lo reenvíe.` },
      revocada: { icon: Link2Off, title: 'Este enlace ya no está activo', body: `${who} ha anulado la negociación. Si crees que es un error, contacta con quien te lo envió.` },
      cerrada: { icon: Lock, title: 'Negociación cerrada', body: 'Este borrador ya no admite cambios.' },
      invalida: { icon: Link2Off, title: 'Enlace no válido', body: 'Revisa que has abierto el último enlace que te enviaron. Si te mandaron uno nuevo, el anterior deja de funcionar.' },
    };
    const m = msg[view.status as Closed];
    return <Shell><StateMessage icon={m.icon} title={m.title}><p>{m.body}</p></StateMessage></Shell>;
  }

  const set = (key: string, patch: Partial<Local>) => {
    setLocal(l => ({ ...l, [key]: { ...l[key], ...patch } }));
    if (errors[key]) setErrors(e => { const x = { ...e }; delete x[key]; return x; });
    setConfirmAll(false);
    setSubmitError('');
  };
  const actions = Object.entries(local).filter(([, v]) => v.action);
  const proposals = actions.filter(([, v]) => v.action === 'propongo').length;
  const comments = actions.filter(([, v]) => v.action === 'comento').length;
  const accepted = clauses.filter(c => local[c.key]?.action === 'acepto' || (!local[c.key]?.action && !needsReview(c))).length;
  const reviewedCount = clauses.filter(reviewed).length;
  const acceptAllMode = proposals === 0 && comments === 0;

  const submit = async (acceptAll: boolean) => {
    setSubmitError('');
    const items = clauses.filter(c => local[c.key]?.action).map(c => {
      const l = local[c.key];
      if (l.action === 'propongo') return { key: c.key, action: 'propongo', text: l.text, reason: l.reason };
      if (l.action === 'comento') return { key: c.key, action: 'comento', text: l.comment };
      return { key: c.key, action: 'acepto' };
    });
    // Local checks (the server applies the same rules).
    const errs: Record<string, string> = {};
    for (const c of clauses) {
      const l = local[c.key];
      if (l?.action === 'propongo') {
        if (!l.text.trim()) errs[c.key] = 'Escribe la redacción que propones.';
        else if (l.text.trim() === c.text.trim()) errs[c.key] = 'La redacción propuesta es igual a la actual.';
        else if (c.reasonRequired && !l.reason.trim()) errs[c.key] = 'Explica el motivo del cambio: es una cláusula negociable.';
      }
      if (l?.action === 'comento' && !l.comment.trim()) errs[c.key] = 'Escribe tu comentario.';
      if (!acceptAll && !l?.action && needsReview(c)) errs[c.key] = 'Acepta, propón un cambio o comenta esta cláusula.';
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      setFilter('todas');
      setSubmitError(`Revisa ${Object.keys(errs).length === 1 ? 'la cláusula marcada' : `las ${Object.keys(errs).length} cláusulas marcadas`}.`);
      setTimeout(() => document.getElementById(`clause-${Object.keys(errs)[0]}`)?.focus(), 0);
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/negotiations/public/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, acceptAll }),
      });
      const r = await res.json().catch(() => ({}));
      if (r.ok) setDone({ agreed: r.status === 'acordado', company: r.ownerCompany || open.ownerCompany });
      else if (r.status === 'invalid_input') { setErrors(r.errors ?? {}); setSubmitError(r.error || 'Revisa las cláusulas marcadas.'); setFilter('todas'); }
      else if (r.status) setView({ status: r.status, ownerCompany: open.ownerCompany });
      else setSubmitError(r.error || 'No pudimos enviar tu revisión. Inténtalo de nuevo.');
    } catch {
      setSubmitError('No pudimos enviar tu revisión. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSending(false); setConfirmAll(false);
    }
  };

  return (
    <Shell wide>
      <header className="space-y-2 mb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-h3 text-text-heading tracking-wide">AVOCAT</p>
          <p className="text-caption text-text-muted">El enlace caduca el {formatContractDate(open.expiresAt.slice(0, 10))}</p>
        </div>
        <h1 className="font-display text-h2 text-text-heading">{open.ownerCompany} te ha enviado un borrador de NDA</h1>
        <p className="text-body-sm text-text-muted">«{open.title}» · Ronda {open.round}{open.round > 1 ? ` · ${open.ownerCompany} ha respondido a tu propuesta` : ''}</p>
        <p className="text-body-sm text-text" role="status">{reviewedCount} de {clauses.length} cláusulas revisadas</p>
        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
          <div className="h-full bg-accent" style={{ width: `${(reviewedCount / Math.max(1, clauses.length)) * 100}%` }} />
        </div>
      </header>

      <div className="rounded-md border border-border bg-surface-muted px-4 py-3 mb-4 space-y-2">
        <p className="text-small text-text">Nada se firma hasta que las dos partes estéis de acuerdo. En cada cláusula puedes aceptarla, proponer otra redacción o dejar un comentario.</p>
        {open.showLevels && (
          <ul className="flex flex-col gap-1.5" aria-label="Niveles de las cláusulas">
            {CLAUSE_LEVELS.map(l => <li key={l} className="flex flex-wrap items-center gap-2 text-caption text-text-muted"><LevelBadge level={l} /> {LEVEL_HELP[l]}</li>)}
          </ul>
        )}
      </div>

      <div role="group" aria-label="Filtrar cláusulas" className="flex flex-wrap gap-2 mb-4">
        {([['pendientes', 'Pendientes'], ['cambios', 'Con cambios'], ['todas', 'Todas']] as const).map(([f, label]) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`min-h-touch px-4 rounded-full border text-small ${filter === f ? 'bg-accent-subtle border-accent-border text-text font-medium' : 'border-border-strong text-text-muted hover:text-text'}`}>
            {label}
          </button>
        ))}
      </div>

      <ol className="space-y-4 pb-40">
        {shown.length === 0 && (
          <li className="text-body-sm text-text-muted text-center py-6">
            {filter === 'pendientes' ? 'No queda ninguna cláusula por revisar en esta ronda.' : 'Ninguna cláusula en este filtro.'}
          </li>
        )}
        {shown.map(c => {
          const l = local[c.key] ?? { text: c.text, reason: '', comment: '' };
          const err = errors[c.key];
          return (
            <li key={c.key}>
              <article id={`clause-${c.key}`} tabIndex={-1} aria-labelledby={`h-${c.key}`}
                className={`bg-surface border rounded-xl p-4 space-y-3 ${err ? 'border-danger' : 'border-border'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`h-${c.key}`} className="font-sans text-small font-semibold text-text-heading flex-1 min-w-[12rem]">Cláusula {c.n}. {c.heading}</h2>
                  {c.level && <LevelBadge level={c.level} />}
                  {!needsReview(c) && !l.action && <ClauseStateChip state="aceptada" />}
                </div>
                <ClauseText text={c.text} className="font-document text-body text-text" />

                {c.ownerDecision && (
                  <div className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-2 text-small text-text space-y-1">
                    <p className="font-semibold">
                      {c.ownerDecision.action === 'aceptar' ? `${open.ownerCompany} aceptó tu cambio` : c.ownerDecision.action === 'rechazar'
                        ? `${open.ownerCompany} rechazó tu cambio` : `${open.ownerCompany} propone otra redacción (el texto de arriba)`}
                    </p>
                    {c.ownerDecision.reason && <p>Motivo: {c.ownerDecision.reason}</p>}
                  </div>
                )}
                {c.comments.length > 0 && (
                  <ul className="space-y-2" aria-label="Comentarios">
                    {c.comments.map((k, i) => (
                      <li key={i} className={`rounded-lg px-3 py-2 text-small ${k.by === 'tercero' ? 'bg-surface-muted text-text ml-6' : 'bg-accent-subtle text-text'}`}>
                        <span className="block text-caption text-text-muted">{k.by === 'tercero' ? 'Tú' : open.ownerCompany} · ronda {k.round}</span>
                        {k.text}
                      </li>
                    ))}
                  </ul>
                )}

                <div role="group" aria-label={`Tu respuesta a la cláusula ${c.n}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <ActionButton icon={ThumbsUp} active={l.action === 'acepto'} onClick={() => set(c.key, { action: l.action === 'acepto' ? undefined : 'acepto' })}>Acepto</ActionButton>
                  {c.canPropose && (
                    <ActionButton icon={PencilLine} active={l.action === 'propongo'} onClick={() => set(c.key, { action: l.action === 'propongo' ? undefined : 'propongo' })}>Propongo cambio</ActionButton>
                  )}
                  <ActionButton icon={MessageSquare} active={l.action === 'comento'} onClick={() => set(c.key, { action: l.action === 'comento' ? undefined : 'comento' })}>Comento</ActionButton>
                </div>
                {!c.canPropose && <p className="text-caption text-text-muted flex items-center gap-1.5"><Lock size={16} aria-hidden /> Esta cláusula no se puede modificar: puedes aceptarla o comentarla.</p>}

                {l.action === 'propongo' && (
                  <div className="space-y-2">
                    <label htmlFor={`text-${c.key}`} className="block text-small font-medium text-text">Tu redacción</label>
                    <textarea id={`text-${c.key}`} className={FIELD} rows={8} maxLength={CLAUSE_TEXT_MAX} value={l.text}
                      onChange={e => set(c.key, { text: e.target.value })} aria-invalid={err ? true : undefined} aria-describedby={err ? `err-${c.key}` : undefined} />
                    {l.text.trim() !== c.text.trim() && l.text.trim() && (
                      <details className="text-small">
                        <summary className="cursor-pointer min-h-touch flex items-center text-accent-text">Ver cambios</summary>
                        <DiffText before={c.text} after={l.text} className="text-body-sm text-text rounded-lg border border-border p-3" />
                      </details>
                    )}
                    <label htmlFor={`reason-${c.key}`} className="block text-small font-medium text-text">
                      Motivo {c.reasonRequired ? <span className="text-danger-text" aria-hidden>*</span> : <span className="text-text-muted font-normal">(opcional)</span>}
                    </label>
                    <textarea id={`reason-${c.key}`} className={FIELD} rows={2} maxLength={NOTE_MAX} value={l.reason} onChange={e => set(c.key, { reason: e.target.value })} />
                  </div>
                )}
                {l.action === 'comento' && (
                  <div className="space-y-2">
                    <label htmlFor={`comment-${c.key}`} className="block text-small font-medium text-text">Tu comentario</label>
                    <textarea id={`comment-${c.key}`} className={FIELD} rows={3} maxLength={NOTE_MAX} value={l.comment}
                      onChange={e => set(c.key, { comment: e.target.value })} aria-invalid={err ? true : undefined} aria-describedby={err ? `err-${c.key}` : undefined} />
                  </div>
                )}
                {err && <p id={`err-${c.key}`} className="text-caption text-danger-text">{err}</p>}
              </article>
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          <p className="text-caption text-text-muted">{accepted} aceptadas · {proposals} {proposals === 1 ? 'cambio' : 'cambios'} · {comments} {comments === 1 ? 'comentario' : 'comentarios'}</p>
          {submitError && <p role="alert" className="text-caption text-danger-text">{submitError}</p>}
          {acceptAllMode ? (
            confirmAll ? (
              <div className="space-y-2">
                <p className="text-small text-text">Aceptas las {clauses.length} cláusulas tal como están. {open.ownerCompany} preparará la versión final para firmar.</p>
                <div className="flex gap-2">
                  <Button variant="primary" size="lg" block loading={sending} loadingText="Enviando…" onClick={() => submit(true)}>Confirmar</Button>
                  <Button variant="secondary" size="lg" onClick={() => setConfirmAll(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="lg" block onClick={() => setConfirmAll(true)}>Acepto el borrador completo</Button>
            )
          ) : (
            <Button variant="primary" size="lg" block loading={sending} loadingText="Enviando…" onClick={() => submit(false)}>Enviar propuesta</Button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function ActionButton({ icon: Icon, active, onClick, children }: { icon: typeof ThumbsUp; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 min-h-touch px-3 rounded-md border text-small font-medium ${active ? 'bg-accent-subtle border-accent-border text-text' : 'border-border-strong text-text hover:bg-surface-muted'}`}>
      <Icon size={16} aria-hidden /> {children}
    </button>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="bg-bg min-h-[70vh]">
      <div className={`${wide ? 'max-w-3xl' : 'max-w-xl'} mx-auto px-4 py-8 sm:py-12`}>{children}</div>
    </div>
  );
}
