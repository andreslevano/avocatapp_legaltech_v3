'use client';

// /negociaciones/{id} — the owner's side. Layout by status:
//   en_revision / caducada   who has it, sent / opened, Reenviar · Anular, history
//   cambios_propuestos       answer each proposal (Aceptar · Rechazar · Contrapropuesta) and comment,
//                            "Enviar respuesta · ronda N"
//   acordado                 timeline, changes from the template, "Generar versión acordada", then
//                            Firmar y enviar (digital or handwritten) on that final document only
//   revocada / cerrada       a message and the history
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, FileCheck2, History, MessageSquare, RotateCw, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import SignAndSendButton from '@/components/signatures/SignAndSendButton';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocBranding } from '@/hooks/useDocBranding';
import { buildPdfBlob, buildWordBlob, type DocMeta } from '@/lib/agent-export';
import { saveDocumentToStorage } from '@/lib/storage-client';
import { MFW_NDA_TEMPLATE } from '@/lib/org-templates/mobiforwork-nda';
import { formatContractDate } from '@/lib/contracts/dates';
import { levelAllows } from '@/lib/negotiations/levels';
import { awaitsOwner, effectiveStatus } from '@/lib/negotiations/rules';
import {
  finalizeNegotiation, linkFinalDocument, NegotiationClientError, resendNegotiation, respondNegotiation, revokeNegotiation,
  watchNegotiationEvents, type SentResult,
} from '@/lib/negotiations/client';
import type { NegClause, Negotiation, NegotiationEvent, OwnerDecision } from '@/lib/negotiations/types';
import { ClauseStateChip, ClauseText, DiffText, LevelBadge, NegotiationStatusChip } from './shared';

type Ev = NegotiationEvent & { id: string; counts?: Record<string, number> };
type Draft = { action?: OwnerDecision['action']; text: string; reason: string; reply: string };

const TEXTAREA = 'w-full px-3 py-2 border border-border-strong rounded-md bg-surface text-body-sm text-text leading-relaxed';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const EVENT_LABEL: Record<NegotiationEvent['type'], string> = {
  created: 'Borrador preparado', sent: 'Enviado a revisión', resent: 'Enlace reenviado', opened: 'Abierto por la otra parte',
  submitted: 'Propuesta recibida', responded: 'Respuesta enviada', accepted: 'Versión aceptada', finalized: 'Versión acordada generada',
  revoked: 'Negociación anulada',
};

export default function OwnerNegotiation({ n, focus }: { n: Negotiation; focus?: string | null }) {
  const [events, setEvents] = useState<Ev[]>([]);
  useEffect(() => watchNegotiationEvents(n.id, setEvents), [n.id]);
  const status = effectiveStatus(n);

  return (
    <div className="space-y-5">
      <header className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-sans text-small font-semibold text-text-heading truncate">{n.title}</h2>
          <p className="text-caption text-text-muted">
            Con {n.counterparty.name}{n.counterparty.company ? ` · ${n.counterparty.company}` : ''} · {n.counterparty.email} · Ronda {n.round} · Versión {n.version}
          </p>
        </div>
        <NegotiationStatusChip status={status} />
      </header>

      {(status === 'en_revision' || status === 'caducada') && <Waiting n={n} status={status} />}
      {status === 'cambios_propuestos' && <Respond key={`${n.round}`} n={n} focus={focus} />}
      {status === 'acordado' && <Agreed n={n} events={events} />}
      {(status === 'revocada' || status === 'cerrada') && (
        <Alert tone="info" title={status === 'revocada' ? 'Negociación anulada' : 'Negociación cerrada'}>
          El enlace ya no funciona y el borrador no se puede firmar. Para empezar de nuevo, genera otro borrador desde el NDA.
        </Alert>
      )}

      <HistoryList events={events} />
    </div>
  );
}

// ── Other party's turn ──────────────────────────────────────────────

function Waiting({ n, status }: { n: Negotiation; status: 'en_revision' | 'caducada' }) {
  const { user } = useAppAuth();
  const [busy, setBusy] = useState<'' | 'resend' | 'revoke'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const run = async (what: 'resend' | 'revoke') => {
    setBusy(what); setMsg(null); setLink(null);
    try {
      if (what === 'resend') {
        const r: SentResult = await resendNegotiation(user, n.id);
        setMsg({ ok: true, text: r.emailed ? `Enlace nuevo enviado a ${n.counterparty.email}. El anterior deja de funcionar.` : 'Enlace nuevo creado; no se pudo enviar el email.' });
        if (r.link) setLink(r.link);
      } else {
        await revokeNegotiation(user, n.id);
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof NegotiationClientError ? e.message : 'No se pudo completar la acción.' });
    } finally {
      setBusy(''); setConfirmRevoke(false);
    }
  };

  return (
    <section aria-labelledby="neg-waiting" className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <h3 id="neg-waiting" className="font-sans text-small font-semibold text-text-heading">
        {status === 'caducada' ? 'El enlace ha caducado' : `Lo tiene ${n.counterparty.name}`}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-caption">
        <div><dt className="text-text-muted">Enviado</dt><dd className="text-text">{fmt(n.lastSentAt)}</dd></div>
        <div><dt className="text-text-muted">Abierto</dt><dd className="text-text">{n.openedAt ? fmt(n.openedAt) : 'Todavía no'}</dd></div>
        <div><dt className="text-text-muted">El enlace caduca</dt><dd className="text-text">{formatContractDate(n.expiresAt.slice(0, 10))}</dd></div>
      </dl>
      {msg && <Alert tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
      {link && (
        <div className="flex gap-2">
          <input readOnly value={link} aria-label="Enlace de revisión" onFocus={e => e.currentTarget.select()}
            className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface font-mono text-caption text-text" />
          <Button variant="secondary" size="md" icon={Copy} onClick={() => navigator.clipboard.writeText(link)}>Copiar</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="md" icon={RotateCw} loading={busy === 'resend'} disabled={!!busy} onClick={() => run('resend')}>Reenviar</Button>
        {!confirmRevoke ? (
          <Button variant="ghost" size="md" icon={Ban} disabled={!!busy} onClick={() => setConfirmRevoke(true)}>Anular</Button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="text-caption text-text">¿Anular? El enlace dejará de funcionar y el borrador no se podrá firmar.</span>
            <Button variant="destructive" size="sm" loading={busy === 'revoke'} onClick={() => run('revoke')}>Sí, anular</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(false)}>Cancelar</Button>
          </span>
        )}
      </div>
    </section>
  );
}

// ── Owner's turn ────────────────────────────────────────────────────

function Respond({ n, focus }: { n: Negotiation; focus?: string | null }) {
  const { user } = useAppAuth();
  const pending = n.clauses.filter(awaitsOwner);
  const acceptedPlain = n.clauses.filter(c => c.state === 'aceptada').length;
  const [selected, setSelected] = useState<string>(() => (focus && pending.some(c => c.key === focus) ? focus : pending[0]?.key ?? ''));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(pending.map(c => [c.key, { text: c.proposal?.text ?? c.current, reason: '', reply: '' }])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<SentResult | null>(null);

  const set = (key: string, patch: Partial<Draft>) => {
    setDrafts(d => ({ ...d, [key]: { ...d[key], ...patch } }));
    if (errors[key]) setErrors(e => { const x = { ...e }; delete x[key]; return x; });
  };
  const answered = (c: NegClause) => {
    const d = drafts[c.key];
    if (c.state === 'propuesta') {
      if (d?.action === 'aceptar') return true;
      if (d?.action === 'rechazar') return !!d.reason.trim();
      if (d?.action === 'contrapropuesta') return !!d.text.trim();
      return false;
    }
    return !!d?.reply.trim();
  };
  const done = pending.filter(answered).length;
  const proposalsOk = pending.filter(c => c.state === 'propuesta').every(answered);
  const clause = pending.find(c => c.key === selected) ?? pending[0];

  const submit = async () => {
    setError('');
    const decisions = pending.filter(c => c.state === 'propuesta').map(c => {
      const d = drafts[c.key];
      return { key: c.key, action: d.action!, ...(d.action === 'contrapropuesta' ? { text: d.text } : {}), ...(d.reason.trim() ? { reason: d.reason } : {}) };
    });
    const replies = pending.filter(c => drafts[c.key]?.reply.trim()).map(c => ({ key: c.key, text: drafts[c.key].reply }));
    setBusy(true);
    try {
      setSent(await respondNegotiation(user, n.id, { decisions, replies }));
    } catch (e) {
      if (e instanceof NegotiationClientError) {
        setError(e.message);
        if (e.errors) { setErrors(e.errors); const k = Object.keys(e.errors)[0]; if (k) setSelected(k); }
      } else setError('No se pudo enviar la respuesta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Alert tone="success" title={`Respuesta enviada · ronda ${n.round + 1}`}>
        {sent.emailed ? `${n.counterparty.name} ha recibido un email con el enlace.` : `No se pudo enviar el email. Envía este enlace a ${n.counterparty.name}: ${sent.link}`}
      </Alert>
    );
  }
  if (!clause) return <Alert tone="info">No hay nada pendiente de responder.</Alert>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <nav aria-label="Cláusulas por responder" className="bg-surface border border-border rounded-xl p-2 space-y-3 self-start">
          <p className="px-2 pt-1 text-label uppercase tracking-widest text-text-muted">Por responder</p>
          <ul className="space-y-1">
            {pending.map(c => (
              <li key={c.key}>
                <button type="button" onClick={() => setSelected(c.key)} aria-current={clause.key === c.key ? 'true' : undefined}
                  className={`w-full text-left min-h-touch px-2 py-2 rounded-lg flex items-start gap-2 ${clause.key === c.key ? 'bg-surface-muted' : 'hover:bg-surface-muted'}`}>
                  {answered(c) ? <CheckCircle2 size={16} aria-hidden className="mt-0.5 text-success-text flex-shrink-0" /> : c.state === 'comentada'
                    ? <MessageSquare size={16} aria-hidden className="mt-0.5 text-info-text flex-shrink-0" />
                    : <span aria-hidden className="mt-1.5 w-2 h-2 rounded-full bg-warning-text flex-shrink-0" />}
                  <span className="min-w-0">
                    <span className="block text-small text-text truncate">{c.n}. {c.heading}</span>
                    <span className="block text-caption text-text-muted">{c.state === 'propuesta' ? 'Cambio propuesto' : 'Comentario'}{answered(c) ? ' · respondida' : ''}</span>
                  </span>
                  {errors[c.key] && <span className="sr-only">(tiene un error)</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-2 pb-1 text-caption text-text-muted">{acceptedPlain} {acceptedPlain === 1 ? 'cláusula aceptada' : 'cláusulas aceptadas'} sin cambios</p>
        </nav>

        <ClauseResponse c={clause} d={drafts[clause.key]} error={errors[clause.key]} onChange={p => set(clause.key, p)} />
      </div>

      <div className="sticky bottom-0 z-20 bg-surface border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <p className="text-small text-text flex-1" role="status">{done} de {pending.length} respondidas</p>
        {error && <p className="w-full text-caption text-danger-text" role="alert">{error}</p>}
        <Button variant="accent" size="md" loading={busy} disabled={!proposalsOk} onClick={submit}
          title={proposalsOk ? undefined : 'Decide sobre cada cambio propuesto'}>
          Enviar respuesta · ronda {n.round + 1}
        </Button>
      </div>
    </div>
  );
}

function ClauseResponse({ c, d, error, onChange }: { c: NegClause; d: Draft; error?: string; onChange: (p: Partial<Draft>) => void }) {
  const tercero = c.comments.filter(k => k.by === 'tercero' && k.round === Math.max(0, ...c.comments.map(x => x.round)));
  return (
    <section aria-labelledby={`resp-${c.key}`} className="bg-surface border border-border rounded-xl p-4 space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`resp-${c.key}`} className="font-sans text-small font-semibold text-text-heading flex-1 min-w-0">Cláusula {c.n}. {c.heading}</h3>
        <LevelBadge level={c.level} />
        <ClauseStateChip state={c.state} />
      </div>

      {c.state === 'propuesta' && c.proposal && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-label uppercase tracking-widest text-text-muted">Texto actual</p>
              <ClauseText text={c.current} className="text-body-sm text-text" />
            </div>
            <div className="rounded-lg border border-accent-border p-3 space-y-1">
              <p className="text-label uppercase tracking-widest text-text-muted">Propuesta</p>
              <DiffText before={c.current} after={c.proposal.text} className="text-body-sm text-text" />
            </div>
          </div>
          {c.proposal.reason && (
            <p className="text-small text-text"><span className="font-semibold">Motivo:</span> {c.proposal.reason}</p>
          )}
          <fieldset className="space-y-3" aria-describedby={error ? `err-${c.key}` : undefined}>
            <legend className="text-small font-medium text-text mb-2">Tu decisión</legend>
            <div className="flex flex-wrap gap-2">
              {([['aceptar', 'Aceptar'], ['rechazar', 'Rechazar'], ['contrapropuesta', 'Contrapropuesta']] as const).map(([a, label]) => (
                <label key={a} className={`inline-flex items-center gap-2 min-h-touch px-3 rounded-md border cursor-pointer text-small has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${d.action === a ? 'border-accent-border bg-accent-subtle text-text' : 'border-border-strong text-text'}`}>
                  <input type="radio" name={`dec-${c.key}`} checked={d.action === a} onChange={() => onChange({ action: a })} />
                  {label}
                </label>
              ))}
            </div>
            {d.action === 'rechazar' && (
              <div>
                <label htmlFor={`reason-${c.key}`} className="block text-small font-medium text-text mb-1">Motivo del rechazo <span className="text-danger-text" aria-hidden>*</span></label>
                <textarea id={`reason-${c.key}`} className={TEXTAREA} rows={3} maxLength={1000} value={d.reason} onChange={e => onChange({ reason: e.target.value })} />
              </div>
            )}
            {d.action === 'contrapropuesta' && (
              <div className="space-y-2">
                <label htmlFor={`counter-${c.key}`} className="block text-small font-medium text-text">Tu redacción</label>
                <textarea id={`counter-${c.key}`} className={TEXTAREA} rows={8} maxLength={4000} value={d.text} onChange={e => onChange({ text: e.target.value })} />
                <label htmlFor={`creason-${c.key}`} className="block text-small font-medium text-text">Explicación <span className="text-text-muted font-normal">(opcional)</span></label>
                <textarea id={`creason-${c.key}`} className={TEXTAREA} rows={2} maxLength={1000} value={d.reason} onChange={e => onChange({ reason: e.target.value })} />
              </div>
            )}
            {error && <p id={`err-${c.key}`} className="text-caption text-danger-text">{error}</p>}
          </fieldset>
        </>
      )}

      {c.state === 'comentada' && <ClauseText text={c.current} className="text-body-sm text-text rounded-lg border border-border p-3" />}

      {c.comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-label uppercase tracking-widest text-text-muted">Comentarios</p>
          <ul className="space-y-2">
            {c.comments.map((k, i) => (
              <li key={i} className={`rounded-lg px-3 py-2 text-small ${k.by === 'tercero' ? 'bg-surface-muted text-text' : 'bg-accent-subtle text-text ml-6'}`}>
                <span className="block text-caption text-text-muted">{k.by === 'tercero' ? 'La otra parte' : 'Tú'} · ronda {k.round}</span>
                {k.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(c.state === 'comentada' || tercero.length > 0) && (
        <div>
          <label htmlFor={`reply-${c.key}`} className="block text-small font-medium text-text mb-1">Responder al comentario {c.state === 'propuesta' && <span className="text-text-muted font-normal">(opcional)</span>}</label>
          <textarea id={`reply-${c.key}`} className={TEXTAREA} rows={3} maxLength={1000} value={d.reply} onChange={e => onChange({ reply: e.target.value })} />
        </div>
      )}
      {!levelAllows(c.level).propose && c.state === 'comentada' && (
        <p className="text-caption text-text-muted">Cláusula no modificable: la otra parte solo puede aceptarla o comentarla.</p>
      )}
    </section>
  );
}

// ── Agreed ──────────────────────────────────────────────────────────

function Agreed({ n, events }: { n: Negotiation; events: Ev[] }) {
  const { user, userDoc } = useAppAuth();
  const brand = useDocBranding({ company: MFW_NDA_TEMPLATE.company, cif: MFW_NDA_TEMPLATE.cif, member: true });
  const [final, setFinal] = useState<{ markdown: string; documentId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changes = n.clauses.filter(c => c.current !== c.original);

  // A final document already exists: fetch the agreed markdown for "Firmar y enviar".
  useEffect(() => {
    if (!n.finalDocumentId || final) return;
    finalizeNegotiation(user, n.id).then(r => setFinal({ markdown: r.markdown, documentId: n.finalDocumentId })).catch(() => {});
  }, [n.finalDocumentId, n.id, user, final]);

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const { markdown, title, version } = await finalizeNegotiation(user, n.id);
      const base = `NDA_MOBIFORWORK_${n.counterparty.company || n.counterparty.name}_acordado_v${version}`.replace(/\s+/g, '_').slice(0, 70);
      const meta: DocMeta = { authorName: MFW_NDA_TEMPLATE.company, authorNif: `CIF ${MFW_NDA_TEMPLATE.cif}` };
      const { blob } = buildWordBlob(markdown, title, undefined, meta, brand.word);
      const pdf = await buildPdfBlob(markdown, title, undefined, meta, brand.pdf).catch(() => null);
      const record = await saveDocumentToStorage({
        userId: user.uid, plan: userDoc.plan ?? 'Abogados', blob, name: `${base}.doc`, caseId: null,
        clientId: n.clientId, source: 'generated', pdfBlob: pdf?.blob ?? undefined,
      });
      await linkFinalDocument(user, n.id, record.id);
      setFinal({ markdown, documentId: record.id });
    } catch (e) {
      setError(e instanceof NegotiationClientError ? e.message : 'No se pudo generar la versión acordada.');
    } finally {
      setBusy(false);
    }
  };

  const steps = useMemo(() => {
    const out: { label: string; at: string }[] = [];
    for (const e of events) {
      if (e.type === 'sent' && e.round === 1) out.push({ label: 'v1 enviada', at: e.at });
      if (e.type === 'submitted') out.push({ label: `Ronda ${e.round} · propuesta`, at: e.at });
      if (e.type === 'responded') out.push({ label: `Ronda ${e.round} · respuesta`, at: e.at });
      if (e.type === 'accepted') out.push({ label: `Acordado · v${n.version}`, at: e.at });
    }
    return out;
  }, [events, n.version]);

  return (
    <div className="space-y-4">
      <section aria-labelledby="agreed-title" className="bg-surface border border-status-a-tiempo-border rounded-xl p-4 space-y-3">
        <h3 id="agreed-title" className="font-sans flex items-center gap-2 text-small font-semibold text-success-text">
          <CheckCircle2 size={18} aria-hidden /> {n.counterparty.name} aceptó la versión {n.version}
        </h3>
        {steps.length > 0 && (
          <ol className="flex flex-wrap items-center gap-2 text-caption text-text" aria-label="Rondas">
            {steps.map((s, i) => (
              <li key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-text-muted">→</span>}
                <span className="px-2 py-1 rounded-md bg-surface-muted">{s.label} <span className="text-text-muted">· {fmt(s.at)}</span></span>
              </li>
            ))}
          </ol>
        )}
        {!final?.documentId ? (
          <>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button variant="accent" size="md" icon={FileCheck2} loading={busy} loadingText="Generando…" onClick={generate}>Generar versión acordada</Button>
            <p className="text-caption text-text-muted">Word y PDF sin la marca de borrador, guardados en Documentos{n.clientId ? ' y vinculados al cliente' : ''}. Solo esta versión se puede firmar.</p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-small text-text">Versión acordada guardada en <Link href={`/documents?doc=${encodeURIComponent(final.documentId)}`} className="underline text-accent-text">Documentos</Link>.</p>
            <div className="flex flex-wrap gap-2">
              <SignAndSendButton documentId={final.documentId} markdown={final.markdown} title={n.title}
                defaultCounterparty={{ name: n.counterparty.name, email: n.counterparty.email }} language="es" returnTo={`/negociaciones/${n.id}`} />
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="agreed-changes" className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h3 id="agreed-changes" className="font-sans text-small font-semibold text-text-heading">Cambios respecto a la plantilla ({changes.length})</h3>
        {changes.length === 0 ? <p className="text-caption text-text-muted">Se acordó el texto de la plantilla sin cambios.</p> : (
          <ul className="space-y-3">
            {changes.map(c => (
              <li key={c.key} className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-small font-semibold text-text">Cláusula {c.n}. {c.heading}</p>
                <DiffText before={c.original} after={c.current} className="text-body-sm text-text" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── History ─────────────────────────────────────────────────────────

function HistoryList({ events }: { events: Ev[] }) {
  if (!events.length) return null;
  return (
    <details className="bg-surface border border-border rounded-xl">
      <summary className="cursor-pointer min-h-touch px-4 py-3 flex items-center gap-2 text-small font-semibold text-text-heading">
        <History size={16} aria-hidden /> Historial ({events.length})
      </summary>
      <ol className="px-4 pb-4 space-y-2">
        {events.map(e => (
          <li key={e.id} className="text-caption text-text flex flex-wrap gap-x-2">
            <span className="text-text-muted w-32 flex-shrink-0">{fmt(e.at)}</span>
            <span>{EVENT_LABEL[e.type] ?? e.type} · ronda {e.round}</span>
            {e.counts && (
              <span className="text-text-muted">
                {[e.counts.proposals ? `${e.counts.proposals} cambios` : '', e.counts.comments ? `${e.counts.comments} comentarios` : '',
                  e.counts.decisions ? `${e.counts.decisions} decisiones` : '', e.counts.replies ? `${e.counts.replies} respuestas` : ''].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
