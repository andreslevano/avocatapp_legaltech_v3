'use client';

// Revisión de Email — the assistant: purpose + criteria → ranked conversations with reasons →
// tick emails (and attachments) → «Analizar selección» → digest with sources, relations in Avocat,
// and buttons for «Generar informe», «Borrador de respuesta» and «Guardar adjunto». Nothing is
// automatic: every write is a click. Reads the mailbox only.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import {
  AlertTriangle, CalendarClock, Check, Copy, FileText, Link2, ListChecks, Mail, Paperclip, Search, Sparkles, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import { createClientDoc, getClients, updateCase, type CaseDoc, type ClientDoc } from '@/lib/firestore';
import { saveAnalysisDocument } from '@/lib/agent-export';
import { updateDocumentMeta } from '@/lib/storage-client';
import { useDocBranding } from '@/hooks/useDocBranding';
import type { EmailMessageFull, EmailProvider } from '@/lib/email/core';
import {
  digestToMarkdown, MAX_ANALYSIS_EMAILS, type EmailDigest, type RankedEmail, type SearchPlan, type Suggestion, type Thread,
} from '@/lib/email/assistant-core';

const INPUT = 'w-full bg-bg border border-border-strong rounded-lg px-3 py-2 text-body-sm font-sans text-text focus:border-accent-border';
const LABEL = 'block text-caption text-text-muted mb-1';

// Long calls go straight to Cloud Run (Firebase Hosting cuts proxied requests at ~60 s).
const longUrl = (path: string) => (process.env.NEXT_PUBLIC_CLOUD_RUN_URL ? `${process.env.NEXT_PUBLIC_CLOUD_RUN_URL}${path}` : path);

const fmtDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface Source { n: number; id: string; subject: string; from: string; date: string }
interface DigestResponse { digest: EmailDigest; sources: Source[]; suggestions: Suggestion[]; attachmentsRead: string[] }
type Att = EmailMessageFull['attachments'][number];
const READABLE = /\.(pdf|docx|txt|md|csv)$/i;

export interface EmailAssistantProps {
  user: User;
  plan: string;
  provider: EmailProvider;
  account: string;
  cases: CaseDoc[];
  onApiError: (code: string | undefined, message: string) => Promise<void> | void;
  onOpenEmail: (id: string) => void;
  openId?: string | null;
  error: string;
  setError: (s: string) => void;
}

export default function EmailAssistant({ user, plan, provider, account, cases, onApiError, onOpenEmail, openId, error, setError }: EmailAssistantProps) {
  const brand = useDocBranding();
  const [purpose, setPurpose] = useState('');
  const [keywords, setKeywords] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [searching, setSearching] = useState(false);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [plan_, setPlan] = useState<SearchPlan | null>(null);
  const [usedPlan, setUsedPlan] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [atts, setAtts] = useState<Record<string, Att[] | 'loading'>>({});
  const [pickedAtts, setPickedAtts] = useState<Record<string, { messageId: string; attachmentId: string; name: string }>>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DigestResponse | null>(null);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  useEffect(() => { getClients(user.uid).then(setClients).catch(() => {}); }, [user.uid]);

  // Reset when the mailbox changes.
  useEffect(() => { setThreads(null); setResult(null); setPicked(new Set()); setAtts({}); setPickedAtts({}); }, [provider]);

  const auth = async () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` });

  const search = async () => {
    setSearching(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/email/assist/search', { method: 'POST', headers: await auth(),
        body: JSON.stringify({ provider, purpose, keywords, from: fromEmail, dateFrom, dateTo }) });
      const data = await res.json() as { threads?: Thread[]; plan?: SearchPlan; usedPlan?: boolean; error?: string; code?: string };
      if (!res.ok) { await onApiError(data.code, data.error ?? 'Error al buscar emails.'); return; }
      const ts = data.threads ?? [];
      setThreads(ts); setPlan(data.plan ?? null); setUsedPlan(!!data.usedPlan);
      // Preselect the relevant ones (score ≥ 60), at most 25; without a purpose, nothing.
      const pre = purpose.trim() ? ts.flatMap(t => t.emails).filter(e => e.score >= 60).slice(0, MAX_ANALYSIS_EMAILS).map(e => e.id) : [];
      setPicked(new Set(pre)); setAtts({}); setPickedAtts({});
    } catch { setError('Error al buscar emails.'); }
    finally { setSearching(false); }
  };

  const toggle = (id: string) => setPicked(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else if (n.size < MAX_ANALYSIS_EMAILS) n.add(id);
    return n;
  });
  const toggleThread = (t: Thread) => setPicked(p => {
    const n = new Set(p);
    const all = t.emails.every(e => n.has(e.id));
    for (const e of t.emails) { if (all) n.delete(e.id); else if (n.size < MAX_ANALYSIS_EMAILS) n.add(e.id); }
    return n;
  });

  const loadAtts = async (id: string) => {
    setAtts(a => ({ ...a, [id]: 'loading' }));
    try {
      const res = await fetch('/api/email/message', { method: 'POST', headers: await auth(), body: JSON.stringify({ provider, id }) });
      const data = await res.json() as { message?: EmailMessageFull };
      setAtts(a => ({ ...a, [id]: (data.message?.attachments ?? []).filter(x => x.id) }));
    } catch { setAtts(a => ({ ...a, [id]: [] })); }
  };

  const analyze = async () => {
    if (!picked.size) return;
    setAnalyzing(true); setError(''); setResult(null);
    try {
      const attachments = Object.values(pickedAtts).filter(a => picked.has(a.messageId));
      const res = await fetch(longUrl('/api/email/assist/digest'), { method: 'POST', headers: await auth(),
        body: JSON.stringify({ provider, purpose, ids: [...picked], attachments }) });
      const data = await res.json() as DigestResponse & { error?: string; code?: string };
      if (!res.ok) { await onApiError(data.code, data.error ?? 'No se pudo analizar la selección.'); return; }
      setResult(data);
    } catch { setError('No se pudo analizar la selección. Inténtalo de nuevo.'); }
    finally { setAnalyzing(false); }
  };

  const nPicked = picked.size;
  const nAtts = Object.values(pickedAtts).filter(a => picked.has(a.messageId)).length;

  return (
    <div className="space-y-5">
      {/* 1 · Purpose + criteria */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3" aria-labelledby="ea-search">
        <h2 id="ea-search" className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">Qué buscas</h2>
        <div>
          <label htmlFor="ea-purpose" className={LABEL}>¿Qué necesitas saber?</label>
          <textarea id="ea-purpose" rows={2} className={`${INPUT} resize-y`} value={purpose} onChange={e => setPurpose(e.target.value)}
            placeholder="Ej.: Qué hemos acordado con Pablo Álvarez sobre las soluciones de sostenibilidad y qué queda pendiente" />
          <p className="text-caption text-text-muted mt-1">El asistente busca a las personas como remitentes o destinatarios (no solo menciones) y ordena los emails por relevancia.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ea-kw" className={LABEL}>Palabras clave</label>
            <input id="ea-kw" className={INPUT} placeholder="Ej.: contrato, piloto, requerimiento" value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <div>
            <label htmlFor="ea-from" className={LABEL}>De (remitente)</label>
            <input id="ea-from" className={INPUT} placeholder="ejemplo@dominio.com" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ea-df" className={LABEL}>Desde</label>
            <input id="ea-df" type="date" className={INPUT} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ea-dt" className={LABEL}>Hasta</label>
            <input id="ea-dt" type="date" className={INPUT} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        {error && <p role="alert" className="text-caption text-danger-text">{error}</p>}
        <div className="flex justify-end">
          <Button variant="primary" size="sm" loading={searching} onClick={search}><Search size={16} aria-hidden /> Buscar emails</Button>
        </div>
      </section>

      {/* 2 · Ranked conversations with selection */}
      {threads && (
        <section className="bg-surface border border-border rounded-xl overflow-hidden" aria-labelledby="ea-results">
          <div className="px-5 py-3 border-b border-border space-y-1">
            <h2 id="ea-results" className="font-sans text-body-sm font-semibold text-text-heading">
              {threads.length === 0 ? 'Sin resultados' : `${threads.reduce((s, t) => s + t.emails.length, 0)} emails en ${threads.length} ${threads.length !== 1 ? 'conversaciones' : 'conversación'}`}
            </h2>
            {plan_ && usedPlan && (plan_.people.length > 0 || plan_.topics.length > 0) && (
              <p className="text-caption text-text-muted">
                Búsqueda: {plan_.people.length > 0 && <>participantes <strong className="text-text">{plan_.people.map(p => p.email ?? p.name).join(', ')}</strong></>}
                {plan_.people.length > 0 && plan_.topics.length > 0 && ' · '}
                {plan_.topics.length > 0 && <>temas <strong className="text-text">{plan_.topics.join(', ')}</strong></>}
              </p>
            )}
            {plan_ && !usedPlan && (purpose || keywords) && <p className="text-caption text-text-muted">No hubo resultados con los participantes detectados; se muestra la búsqueda por palabras.</p>}
          </div>

          <ul className="divide-y divide-border">
            {threads.map(t => {
              const allOn = t.emails.every(e => picked.has(e.id));
              return (
                <li key={t.threadId} className="px-5 py-3">
                  <div className="flex items-center gap-3 mb-1.5">
                    <input type="checkbox" className="h-4 w-4 accent-accent" checked={allOn} onChange={() => toggleThread(t)}
                      aria-label={`Seleccionar la conversación ${t.subject}`} />
                    <p className="text-body-sm font-medium text-text-heading truncate flex-1">{t.subject || '(Sin asunto)'}</p>
                    {t.emails.length > 1 && <span className="text-caption text-text-muted shrink-0">{t.emails.length} emails</span>}
                  </div>
                  <ul className="space-y-1 pl-7">
                    {t.emails.map(e => <EmailRow key={e.id} e={e} on={picked.has(e.id)} open={openId === e.id} onToggle={() => toggle(e.id)} onOpen={() => onOpenEmail(e.id)}
                      atts={atts[e.id]} onLoadAtts={() => loadAtts(e.id)} pickedAtts={pickedAtts}
                      onPickAtt={a => setPickedAtts(p => { const k = `${e.id}:${a.id}`; const n = { ...p }; if (n[k]) delete n[k]; else n[k] = { messageId: e.id, attachmentId: a.id!, name: a.name }; return n; })} />)}
                  </ul>
                </li>
              );
            })}
          </ul>

          {threads.length > 0 && (
            <div className="sticky bottom-0 px-5 py-3 border-t border-border bg-surface-raised flex flex-wrap items-center gap-3">
              <span className="text-caption text-text">
                {nPicked} de {MAX_ANALYSIS_EMAILS} emails seleccionados{nAtts ? ` · ${nAtts} adjunto${nAtts !== 1 ? 's' : ''}` : ''}
              </span>
              <button className="text-caption text-accent-text hover:underline" onClick={() => setPicked(new Set(threads.flatMap(t => t.emails).slice(0, MAX_ANALYSIS_EMAILS).map(e => e.id)))}>Seleccionar todo</button>
              <button className="text-caption text-text-muted hover:underline" onClick={() => setPicked(new Set())}>Ninguno</button>
              <span className="ml-auto">
                <Button variant="primary" size="sm" loading={analyzing} disabled={!nPicked} onClick={analyze}>
                  <Sparkles size={16} aria-hidden /> Analizar selección
                </Button>
              </span>
            </div>
          )}
          {analyzing && <p className="px-5 pb-3 text-caption text-text-muted" aria-live="polite">Leyendo {nPicked} email{nPicked !== 1 ? 's' : ''}{nAtts ? ` y ${nAtts} adjunto${nAtts !== 1 ? 's' : ''}` : ''}… puede tardar hasta un minuto.</p>}
        </section>
      )}

      {/* 3 · Digest, relations and actions */}
      {result && (
        <DigestView result={result} purpose={purpose} account={account} provider={provider} user={user} plan={plan} brand={brand}
          cases={cases} clients={clients} setClients={setClients} pickedIds={[...picked]} onOpenEmail={onOpenEmail} setError={setError} />
      )}
    </div>
  );
}

function EmailRow({ e, on, open, onToggle, onOpen, atts, onLoadAtts, pickedAtts, onPickAtt }: {
  e: RankedEmail; on: boolean; open: boolean; onToggle: () => void; onOpen: () => void;
  atts?: Att[] | 'loading'; onLoadAtts: () => void; pickedAtts: Record<string, unknown>; onPickAtt: (a: Att) => void;
}) {
  const tone = e.score >= 70 ? 'text-success-text' : e.score >= 40 ? 'text-warning-text' : 'text-text-muted';
  return (
    <li className={`rounded-lg px-2 py-1.5 ${open ? 'bg-surface-muted' : ''}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" className="h-4 w-4 mt-0.5 accent-accent" checked={on} onChange={onToggle} aria-label={`Incluir en el análisis: ${e.subject}, de ${e.from}`} />
        <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
          <span className="flex items-center gap-2">
            <span className="text-caption text-text truncate">{e.from}</span>
            {e.hasAttachments && <Paperclip size={12} className="text-text-muted shrink-0" aria-label="Con adjuntos" />}
            <span className="text-caption text-text-muted ml-auto shrink-0">{fmtDate(e.date)}</span>
          </span>
          {e.reason ? <span className={`block text-caption ${tone}`}>{e.reason}</span> : <span className="block text-caption text-text-muted line-clamp-1">{e.snippet}</span>}
        </button>
      </div>
      {e.hasAttachments && (
        <div className="pl-7 mt-1">
          {atts === undefined && <button className="text-caption text-accent-text hover:underline" onClick={onLoadAtts}>Elegir adjuntos para el análisis</button>}
          {atts === 'loading' && <span className="text-caption text-text-muted">Cargando adjuntos…</span>}
          {Array.isArray(atts) && (atts.length === 0 ? <span className="text-caption text-text-muted">Sin adjuntos descargables.</span> : (
            <ul className="space-y-0.5">
              {atts.map(a => {
                const readable = READABLE.test(a.name);
                return (
                  <li key={a.id}>
                    <label className={`inline-flex items-center gap-2 text-caption ${readable ? 'text-text' : 'text-text-muted'}`}>
                      <input type="checkbox" className="h-4 w-4 accent-accent" disabled={!readable || !on} checked={!!pickedAtts[`${e.id}:${a.id}`]} onChange={() => onPickAtt(a)} />
                      {a.name} <span className="text-text-muted">· {Math.max(1, Math.round(a.size / 1024))} KB{!readable ? ' · no se puede leer' : !on ? ' · marca el email' : ''}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      )}
    </li>
  );
}

function DigestView({ result, purpose, account, provider, user, plan, brand, cases, clients, setClients, pickedIds, onOpenEmail, setError }: {
  result: DigestResponse; purpose: string; account: string; provider: EmailProvider; user: User; plan: string;
  brand: ReturnType<typeof useDocBranding>; cases: CaseDoc[]; clients: ClientDoc[]; setClients: (c: ClientDoc[]) => void;
  pickedIds: string[]; onOpenEmail: (id: string) => void; setError: (s: string) => void;
}) {
  const { digest: d, sources, suggestions, attachmentsRead } = result;
  const src = (f: number[]) => f.map(n => sources.find(s => s.n === n)).filter((s): s is Source => !!s);
  const Ref = ({ f }: { f: number[] }) => (
    <>{src(f).map(s => (
      <button key={s.n} onClick={() => onOpenEmail(s.id)} title={`${s.subject} — ${s.from}`}
        className="ml-1 inline-flex items-center px-1.5 rounded-xs bg-surface-muted text-caption text-accent-text hover:underline">email {s.n}</button>
    ))}</>
  );

  // Destination for the report / attachment: the first suggested case, else the first suggested client.
  const sugCase = suggestions.find((s): s is Extract<Suggestion, { type: 'case' }> => s.type === 'case');
  const sugClient = suggestions.find((s): s is Extract<Suggestion, { type: 'client' }> => s.type === 'client');
  const [caseId, setCaseId] = useState(sugCase?.caseId ?? '');
  const [clientId, setClientId] = useState(sugClient?.clientId ?? '');
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const mark = (k: string, v: string) => setDone(p => ({ ...p, [k]: v }));

  const activeCases = useMemo(() => cases.filter(c => c.status !== 'closed' && c.status !== 'archived'), [cases]);

  const generateReport = async () => {
    setBusy('report'); setError('');
    try {
      const md = digestToMarkdown(d, { purpose, account, sources });
      const rec = await saveAnalysisDocument({ content: md, title: `Informe emails — ${(purpose || sources[0]?.subject || 'conversación').slice(0, 60)}`,
        userId: user.uid, plan, caseId: caseId || null, branding: brand.word, pdfBranding: brand.pdf });
      if (clientId && rec?.id) await updateDocumentMeta(rec.id, { clientId });
      mark('report', caseId ? `/cases/${caseId}` : '/documents');
    } catch { setError('No se pudo guardar el informe.'); }
    finally { setBusy(''); }
  };

  const linkCase = async (id: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    setBusy(`case:${id}`);
    try {
      const stamp = new Date().toLocaleDateString('es-ES');
      await updateCase(id, { notes: `${c.notes ?? ''}\n\n[Revisión de emails ${stamp}] ${purpose ? `${purpose}\n` : ''}${d.resumen}`.trim() });
      mark(`case:${id}`, `/cases/${id}`);
    } catch { setError('No se pudo vincular al caso.'); }
    finally { setBusy(''); }
  };

  const createClient = async (s: Extract<Suggestion, { type: 'new_client' }>) => {
    setBusy(`new:${s.email}`);
    try {
      const c = await createClientDoc(user.uid, { name: s.name, email: s.email, ...(s.organization ? { company: s.organization } : {}) });
      setClients([c, ...clients]); setClientId(c.id);
      mark(`new:${s.email}`, '/clients');
    } catch { setError('No se pudo crear el cliente.'); }
    finally { setBusy(''); }
  };

  const List = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div>
      <h3 className="flex items-center gap-1.5 text-label font-semibold uppercase tracking-widest text-text-muted mb-1.5">{icon}{title}</h3>
      <ul className="space-y-1 text-body-sm text-text">{children}</ul>
    </div>
  );

  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-5" aria-labelledby="ea-digest">
      <div>
        <h2 id="ea-digest" className="font-sans text-h4 font-semibold text-text-heading">Análisis de {sources.length} email{sources.length !== 1 ? 's' : ''}</h2>
        {attachmentsRead.length > 0 && <p className="text-caption text-text-muted">Adjuntos leídos: {attachmentsRead.join(', ')}</p>}
      </div>
      {d.resumen && <p className="text-body-sm text-text leading-relaxed">{d.resumen}</p>}
      {d.temas.length > 0 && <div className="flex flex-wrap gap-1.5">{d.temas.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-accent-subtle text-caption text-accent-text">{t}</span>)}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {d.puntosAtencion.length > 0 && (
          <List icon={<AlertTriangle size={14} aria-hidden />} title="Puntos de atención">
            {d.puntosAtencion.map((p, i) => <li key={i} className="text-warning-text">• {p.texto}<Ref f={p.fuentes} /></li>)}
          </List>
        )}
        {d.fechas.length > 0 && (
          <List icon={<CalendarClock size={14} aria-hidden />} title="Fechas y plazos">
            {d.fechas.map((f, i) => <li key={i}><strong className="text-accent-text">{f.fecha || 'Sin fecha'}</strong> — {f.que}<Ref f={f.fuentes} /></li>)}
          </List>
        )}
        {d.acciones.length > 0 && (
          <List icon={<ListChecks size={14} aria-hidden />} title="Acciones pendientes">
            {d.acciones.map((a, i) => <li key={i}><strong>{a.quien || 'Sin asignar'}</strong>: {a.que}{a.cuando ? ` (${a.cuando})` : ''}<Ref f={a.fuentes} /></li>)}
          </List>
        )}
        {d.personas.length > 0 && (
          <List icon={<Mail size={14} aria-hidden />} title="Personas y organizaciones">
            {d.personas.map((p, i) => <li key={i}>{p.nombre}{p.email ? <span className="text-text-muted"> &lt;{p.email}&gt;</span> : ''}{p.organizacion ? ` · ${p.organizacion}` : ''}{p.rol ? <span className="text-text-muted"> — {p.rol}</span> : ''}</li>)}
          </List>
        )}
        {d.importes.length > 0 && (
          <List icon={<FileText size={14} aria-hidden />} title="Importes">
            {d.importes.map((x, i) => <li key={i}><strong>{x.importe}</strong> — {x.concepto}<Ref f={x.fuentes} /></li>)}
          </List>
        )}
        {d.adjuntosRelevantes.length > 0 && (
          <List icon={<Paperclip size={14} aria-hidden />} title="Adjuntos relevantes">
            {d.adjuntosRelevantes.map((x, i) => <li key={i}>{x.nombre}: {x.porque}<Ref f={x.fuentes} /></li>)}
          </List>
        )}
        {d.preguntasAbiertas.length > 0 && (
          <List icon={<Sparkles size={14} aria-hidden />} title="Preguntas abiertas">
            {d.preguntasAbiertas.map((q, i) => <li key={i}>• {q}</li>)}
          </List>
        )}
      </div>

      {d.cronologia.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-caption text-accent-text">Ver cronología ({d.cronologia.length})</summary>
          <ol className="mt-2 space-y-1 border-l border-border pl-4 text-body-sm text-text">
            {d.cronologia.map((c, i) => <li key={i}><span className="text-text-muted">{c.fecha}</span> · <strong>{c.quien}</strong>: {c.que}<Ref f={c.fuentes} /></li>)}
          </ol>
        </details>
      )}

      {/* Relations in Avocat — proposals only */}
      <div className="border-t border-border pt-4 space-y-2">
        <h3 className="text-label font-semibold uppercase tracking-widest text-text-muted">Relacionado en Avocat</h3>
        {suggestions.length === 0 && <p className="text-caption text-text-muted">No encontramos clientes, casos ni documentos relacionados.</p>}
        <ul className="space-y-1.5">
          {suggestions.map(s => {
            const key = s.type === 'client' ? `client:${s.clientId}` : s.type === 'case' ? `case:${s.caseId}` : s.type === 'record' ? `${s.kind}:${s.id}` : `new:${s.email}`;
            return (
              <li key={key} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-bg border border-border">
                <span className="text-body-sm text-text-heading font-medium">
                  {s.type === 'client' ? `Cliente: ${s.label}` : s.type === 'case' ? `Caso: ${s.label}` : s.type === 'record' ? `${s.kind === 'negotiation' ? 'Negociación' : s.kind === 'signature' ? 'Firma' : 'Contrato'}: ${s.label}` : `${s.name} <${s.email}>`}
                </span>
                <span className="text-caption text-text-muted">{s.reason}</span>
                <span className="ml-auto flex gap-2">
                  {s.type === 'client' && <Link className="text-caption text-accent-text hover:underline" href="/clients">Ver clientes</Link>}
                  {s.type === 'case' && (done[`case:${s.caseId}`]
                    ? <Link className="text-caption text-success-text hover:underline" href={done[`case:${s.caseId}`]}><Check size={14} className="inline" aria-hidden /> Vinculado · ver caso</Link>
                    : <Button variant="secondary" size="sm" loading={busy === `case:${s.caseId}`} onClick={() => linkCase(s.caseId)}><Link2 size={14} aria-hidden /> Añadir resumen al caso</Button>)}
                  {s.type === 'record' && <Link className="text-caption text-accent-text hover:underline" href={s.href}>Abrir</Link>}
                  {s.type === 'new_client' && (done[`new:${s.email}`]
                    ? <span className="text-caption text-success-text"><Check size={14} className="inline" aria-hidden /> Cliente creado</span>
                    : <Button variant="secondary" size="sm" loading={busy === `new:${s.email}`} onClick={() => createClient(s)}><UserPlus size={14} aria-hidden /> Crear cliente</Button>)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Report (button) */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-label font-semibold uppercase tracking-widest text-text-muted">Informe</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ea-case" className={LABEL}>Guardar en el caso</label>
            <select id="ea-case" className={INPUT} value={caseId} onChange={e => setCaseId(e.target.value)}>
              <option value="">Sin caso (Documentos)</option>
              {activeCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ea-client" className={LABEL}>Cliente</label>
            <select id="ea-client" className={INPUT} value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{(c as ClientDoc & { company?: string }).company || c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {done.report
            ? <Link href={done.report} className="text-caption text-success-text hover:underline"><Check size={14} className="inline" aria-hidden /> Informe guardado · ver</Link>
            : <Button variant="primary" size="sm" loading={busy === 'report'} onClick={generateReport}><FileText size={16} aria-hidden /> Generar informe</Button>}
        </div>
        <SaveAttachments result={result} provider={provider} user={user} caseId={caseId} clientId={clientId} />
      </div>

      <ReplyDraft provider={provider} user={user} ids={pickedIds} summary={d.resumen} setError={setError} />

      <AIDisclaimer />
    </section>
  );
}

function SaveAttachments({ result, provider, user, caseId, clientId }: { result: DigestResponse; provider: EmailProvider; user: User; caseId: string; clientId: string }) {
  const [list, setList] = useState<{ messageId: string; subject: string; a: Att }[] | null>(null);
  const [state, setState] = useState<Record<string, 'busy' | 'ok' | 'err'>>({});
  const load = async () => {
    const token = await user.getIdToken();
    const out: { messageId: string; subject: string; a: Att }[] = [];
    for (const s of result.sources) {
      const res = await fetch('/api/email/message', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider, id: s.id }) });
      const m = (await res.json() as { message?: EmailMessageFull }).message;
      for (const a of m?.attachments ?? []) if (a.id) out.push({ messageId: s.id, subject: s.subject, a });
    }
    setList(out);
  };
  const save = async (x: { messageId: string; a: Att }) => {
    const k = `${x.messageId}:${x.a.id}`;
    setState(p => ({ ...p, [k]: 'busy' }));
    const res = await fetch('/api/email/assist/attachment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ provider, messageId: x.messageId, attachmentId: x.a.id, caseId: caseId || null, clientId: clientId || null }) });
    setState(p => ({ ...p, [k]: res.ok ? 'ok' : 'err' }));
  };
  if (!list) return <button className="text-caption text-accent-text hover:underline" onClick={load}>Guardar adjuntos en {caseId ? 'el caso' : 'Documentos'}…</button>;
  if (!list.length) return <p className="text-caption text-text-muted">Los emails analizados no tienen adjuntos.</p>;
  return (
    <ul className="space-y-1">
      {list.map(x => {
        const k = `${x.messageId}:${x.a.id}`;
        return (
          <li key={k} className="flex items-center gap-2 text-caption text-text">
            <Paperclip size={12} aria-hidden /> <span className="truncate">{x.a.name}</span>
            <span className="ml-auto">
              {state[k] === 'ok' ? <span className="text-success-text">Guardado</span>
                : state[k] === 'err' ? <span className="text-danger-text">No se pudo guardar</span>
                : <Button variant="ghost" size="sm" loading={state[k] === 'busy'} onClick={() => save(x)}>Guardar {caseId ? 'en el caso' : ''}</Button>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ReplyDraft({ provider, user, ids, summary, setError }: { provider: EmailProvider; user: User; ids: string[]; summary: string; setError: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ draft: string; subject: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const run = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(longUrl('/api/email/assist/reply'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ provider, ids, instructions, summary }) });
      const data = await res.json() as { draft?: string; subject?: string; error?: string };
      if (!res.ok || !data.draft) throw new Error(data.error);
      setDraft({ draft: data.draft, subject: data.subject ?? '' });
    } catch { setError('No se pudo redactar el borrador.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="border-t border-border pt-4 space-y-3">
      {!open ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}><Mail size={16} aria-hidden /> Borrador de respuesta</Button>
      ) : (
        <>
          <h3 className="text-label font-semibold uppercase tracking-widest text-text-muted">Borrador de respuesta</h3>
          <div>
            <label htmlFor="ea-instr" className={LABEL}>Qué quieres responder (opcional)</label>
            <textarea id="ea-instr" rows={2} className={`${INPUT} resize-y`} value={instructions} onChange={e => setInstructions(e.target.value)}
              placeholder="Ej.: Agradecer, confirmar la reunión del jueves y pedir la propuesta económica" />
          </div>
          <Button variant="secondary" size="sm" loading={busy} onClick={run}>{draft ? 'Redactar de nuevo' : 'Redactar borrador'}</Button>
          {draft && (
            <div className="space-y-2">
              {draft.subject && <p className="text-caption text-text-muted">Asunto: <span className="text-text">{draft.subject}</span></p>}
              <textarea aria-label="Borrador" rows={10} className={`${INPUT} font-sans`} value={draft.draft} onChange={e => setDraft({ ...draft, draft: e.target.value })} />
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={async () => { await navigator.clipboard.writeText(draft.draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <span className="text-caption text-text-muted">Avocat no envía emails: pégalo en {provider === 'outlook' ? 'Outlook' : 'Gmail'} y revísalo antes de enviar.</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
