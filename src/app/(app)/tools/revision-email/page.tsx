'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCases, createCase, updateCase, type CaseDoc } from '@/lib/firestore';
import { saveAnalysisDocument } from '@/lib/agent-export';
import { useDocBranding } from '@/hooks/useDocBranding';
import { PROVIDER_LABEL, type EmailMessageFull as GmailMessageFull, type EmailProvider } from '@/lib/email/core';
import type { EmailStatus } from '@/lib/email/server';
import type { EmailAnalysisResult } from '@/app/api/gmail/analyze/route';
import { Mail, Plus, X } from 'lucide-react';
import EmailAssistant from '@/components/email/EmailAssistant';

function analysisToMarkdown(a: EmailAnalysisResult, subject: string, from: string, date: string): string {
  const lines: string[] = [
    `# Análisis de Email — ${a.categoria}`,
    '',
    `**Asunto:** ${subject}`,
    `**De:** ${from}`,
    `**Fecha:** ${date}`,
    `**Urgencia:** ${a.urgencia.toUpperCase()}`,
    '',
    '## Resumen',
    a.resumen,
  ];
  if (a.partesInvolucradas?.length) {
    lines.push('', '## Partes involucradas');
    a.partesInvolucradas.forEach(p => lines.push(`- ${p}`));
  }
  if (a.fechasClave?.length) {
    lines.push('', '## Fechas clave');
    a.fechasClave.forEach(f => lines.push(`- ${f}`));
  }
  if (a.accionesRequeridas?.length) {
    lines.push('', '## Acciones requeridas');
    a.accionesRequeridas.forEach(ac => lines.push(`- ${ac}`));
  }
  if (a.riesgoLegal && a.riesgoLegal !== 'Sin riesgo aparente') {
    lines.push('', '## Riesgo legal', a.riesgoLegal);
  }
  if (a.adjuntosRelevantes?.length) {
    lines.push('', '## Adjuntos relevantes');
    a.adjuntosRelevantes.forEach(adj => lines.push(`- ${adj}`));
  }
  return lines.join('\n');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseGmailDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

const URGENCIA_CLS: Record<string, string> = {
  alta:  'text-danger-text bg-danger-subtle border-status-urgente-border',
  media: 'text-warning-text bg-warning-subtle border-status-proximo-border',
  baja:  'text-success-text bg-success-subtle border-status-a-tiempo-border',
};

const INPUT = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border';

// ── Gmail tab ─────────────────────────────────────────────────────────────────

function GmailTab({ user, userDoc }: { user: ReturnType<typeof useAppAuth>['user']; userDoc: ReturnType<typeof useAppAuth>['userDoc']; }) {
  const brand = useDocBranding();
  // Mail accounts (Gmail / Outlook) and the provider of the login email (/api/email/status).
  const [status, setStatus]           = useState<EmailStatus | null>(null);
  const [provider, setProvider]       = useState<EmailProvider | null>(null);
  const [connecting, setConnecting]   = useState('');
  const [confirmOff, setConfirmOff]   = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/email/status', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    const st = await res.json() as EmailStatus;
    setStatus(st);
    setProvider(p => {
      const usable = (['gmail', 'outlook'] as const).filter(x => x === 'gmail' ? st.gmail : st.outlook?.mail);
      return p && usable.includes(p) ? p : usable[0] ?? null;
    });
  }, [user]);
  useEffect(() => { loadStatus().catch(() => setStatus({ loginEmail: null, suggested: null, outlookAvailable: false, gmail: null, outlook: null })); }, [loadStatus]);

  const [searchError, setSearchError] = useState('');

  // Selected email + analysis
  const [selected, setSelected]       = useState<GmailMessageFull | null>(null);
  const [loadingMsg, setLoadingMsg]   = useState('');
  const [analysis, setAnalysis]       = useState<EmailAnalysisResult | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);

  // Case actions
  const [cases, setCases]             = useState<CaseDoc[]>([]);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showLinkCase, setShowLinkCase]     = useState(false);
  const [caseForm, setCaseForm]       = useState({ title: '', type: 'civil', client: '', notes: '' });
  const [savingCase, setSavingCase]   = useState(false);
  const [caseSaved, setCaseSaved]     = useState('');

  // Save analysis as document
  const [savingDoc, setSavingDoc]     = useState(false);
  const [docSaved, setDocSaved]       = useState('');

  useEffect(() => {
    if (user?.uid) getCases(user.uid).then(setCases).catch(() => {});
  }, [user?.uid]);

  /** `account`: 'login' preselects the Avocat login email; 'other' lets the provider ask. */
  const handleConnect = async (p: EmailProvider, account: 'login' | 'other') => {
    setConnecting(`${p}:${account}`); setSearchError('');
    try {
      const idToken = await user.getIdToken();
      const url = p === 'gmail'
        ? `/api/gmail/auth?account=${account}`
        : `/api/integrations/microsoft/auth?returnTo=${encodeURIComponent('/tools/revision-email')}&mail=1${account === 'login' ? '&account=login' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      const { url: go, error } = await res.json() as { url?: string; error?: string };
      if (error || !go) throw new Error(error ?? 'Error al iniciar la conexión');
      window.location.href = go;
    } catch (err) {
      setSearchError((err as Error).message);
      setConnecting('');
    }
  };

  const handleDisconnect = async () => {
    if (!provider) return;
    const idToken = await user.getIdToken();
    await fetch(provider === 'gmail' ? '/api/gmail/disconnect' : '/api/integrations/microsoft/disconnect',
      { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
    setConfirmOff(false);
    setSelected(null); setAnalysis(null);
    await loadStatus();
  };

  const onApiError = async (code: string | undefined, fallback: string) => {
    if (code === 'reconnect_required') setSearchError(`La conexión con ${provider ? PROVIDER_LABEL[provider] : 'tu correo'} ha caducado. Vuelve a conectarla.`);
    else if (code === 'mail_not_granted') setSearchError('Microsoft aún no ha dado permiso para leer tu correo. Pulsa «Dar acceso al correo».');
    else setSearchError(fallback);
    if (code === 'reconnect_required' || code === 'mail_not_granted' || code === 'not_connected') await loadStatus();
  };

  const handleSelectEmail = useCallback(async (id: string) => {
    if (!provider) return;
    setLoadingMsg(id); setSelected(null); setAnalysis(null); setCaseSaved('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/email/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ provider, id }),
      });
      const data = await res.json() as { message?: GmailMessageFull; error?: string; code?: string };
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'No se pudo abrir el email.'), { code: data.code });
      setSelected(data.message!);
      setTimeout(() => document.getElementById('email-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) { await onApiError((err as { code?: string }).code, (err as Error).message); }
    finally { setLoadingMsg(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, provider]);

  const handleAnalyze = async () => {
    if (!selected) return;
    setAnalyzing(true); setAnalysis(null); setCaseSaved('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gmail/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          subject: selected.subject,
          from: selected.from,
          to: selected.to,
          date: selected.date,
          body: selected.bodyText,
          attachments: selected.attachments.map(a => a.name),
        }),
      });
      const data = await res.json() as { result?: EmailAnalysisResult; error?: string };
      if (data.error) throw new Error(data.error);
      setAnalysis(data.result!);
      if (data.result?.sugerenciaCaso) {
        setCaseForm({
          title:  data.result.sugerenciaCaso.titulo,
          type:   data.result.sugerenciaCaso.tipo,
          client: data.result.sugerenciaCaso.cliente,
          notes:  data.result.sugerenciaCaso.notas,
        });
      }
    } catch (err) { setSearchError((err as Error).message); }
    finally { setAnalyzing(false); }
  };

  const handleCreateCase = async () => {
    setSavingCase(true);
    try {
      const id = await createCase(user.uid, {
        title:  caseForm.title || 'Caso desde email',
        type:   caseForm.type as CaseDoc['type'],
        status: 'active',
        ref:    '',
        client: caseForm.client,
        notes:  caseForm.notes,
      });
      setCaseSaved(`/cases/${id}`);
      setShowCreateCase(false);
    } catch { setSearchError('Error al crear el caso.'); }
    finally { setSavingCase(false); }
  };

  const handleLinkCase = async (caseId: string) => {
    setSavingCase(true);
    const caseDoc = cases.find(c => c.id === caseId);
    if (analysis && caseDoc) {
      try {
        await updateCase(caseId, {
          notes: `${caseDoc.notes ?? ''}\n\n[Email ${parseGmailDate(selected?.date ?? '')}] De: ${selected?.from}\nAsunto: ${selected?.subject}\n${analysis.resumen}`.trim(),
        });
        setCaseSaved(`/cases/${caseId}`);
        setShowLinkCase(false);
      } catch { setSearchError('Error al vincular el caso.'); }
    }
    setSavingCase(false);
  };

  if (!status) return <p className="text-caption text-text-muted py-10 text-center">Cargando tu correo…</p>;

  const accounts = (['gmail', 'outlook'] as const).filter(x => x === 'gmail' ? status.gmail : status.outlook?.mail);
  const emailOf = (x: EmailProvider) => (x === 'gmail' ? status.gmail?.email : status.outlook?.email) ?? '';
  const canOutlook = status.outlookAvailable;
  const sugg = status.suggested && (status.suggested === 'gmail' || canOutlook) ? status.suggested : null;
  const otherButtons = (exclude?: EmailProvider) => (
    <div className="flex flex-wrap justify-center gap-2">
      {exclude !== 'gmail' && !status.gmail && (
        <Button variant="secondary" size="sm" loading={connecting === 'gmail:other'} onClick={() => handleConnect('gmail', 'other')}>Gmail</Button>
      )}
      {canOutlook && exclude !== 'outlook' && !status.outlook?.mail && (
        <Button variant="secondary" size="sm" loading={connecting === 'outlook:other'} onClick={() => handleConnect('outlook', 'other')}>Outlook</Button>
      )}
    </div>
  );
  // Microsoft connected for OneDrive but without mail permission yet.
  const outlookNeedsMail = canOutlook && status.outlook && !status.outlook.mail;

  if (!accounts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-5">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center"><Mail size={24} className="text-accent-text" aria-hidden /></div>
        {outlookNeedsMail ? (
          <>
            <div>
              <p className="text-body-sm font-sans font-semibold text-text-heading mb-1">Da acceso al correo de {status.outlook!.email}</p>
              <p className="text-caption text-text-muted leading-relaxed">Ya tienes Microsoft conectado para OneDrive. Microsoft te pedirá permiso para que Avocat también lea tu correo (solo lectura).</p>
            </div>
            <Button variant="accent" size="md" loading={connecting === 'outlook:login'} onClick={() => handleConnect('outlook', 'login')}>Dar acceso al correo</Button>
          </>
        ) : sugg && status.loginEmail ? (
          <>
            <div>
              <p className="text-body-sm font-sans font-semibold text-text-heading mb-1">Conecta tu correo</p>
              <p className="text-caption text-text-muted leading-relaxed">
                Te proponemos la cuenta con la que entras en Avocat. {PROVIDER_LABEL[sugg]} te pedirá permiso de solo lectura.
              </p>
            </div>
            <Button variant="accent" size="md" loading={connecting === `${sugg}:login`} onClick={() => handleConnect(sugg, 'login')}>
              Conectar {status.loginEmail} ({PROVIDER_LABEL[sugg]})
            </Button>
          </>
        ) : (
          <div>
            <p className="text-body-sm font-sans font-semibold text-text-heading mb-1">Conecta tu correo</p>
            <p className="text-caption text-text-muted leading-relaxed">Autoriza acceso de solo lectura para buscar, analizar y vincular emails a tus casos.</p>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-caption text-text-muted">{sugg || outlookNeedsMail ? 'O usa otra cuenta:' : 'Elige tu proveedor:'}</p>
          {otherButtons()}
        </div>
        {searchError && <p className="text-caption text-danger-text">{searchError}</p>}
        <p className="text-caption text-text-muted">Avocat solo lee tus emails — nunca envía ni modifica nada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Account bar: which mailbox, switch, add another, disconnect */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl">
        <span className="w-2 h-2 rounded-full bg-success-text flex-shrink-0" aria-hidden />
        {accounts.length > 1 ? (
          <label className="flex items-center gap-2 text-caption text-text">
            Cuenta
            <select value={provider ?? ''} onChange={e => { setProvider(e.target.value as EmailProvider); setSelected(null); setAnalysis(null); }}
              className="bg-bg border border-border-strong rounded-md px-2 py-1 text-caption text-text">
              {accounts.map(a => <option key={a} value={a}>{PROVIDER_LABEL[a]} · {emailOf(a)}</option>)}
            </select>
          </label>
        ) : (
          <span className="text-caption text-text">Conectado como <strong className="text-text-heading">{provider ? emailOf(provider) : ''}</strong> ({provider ? PROVIDER_LABEL[provider] : ''})</span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {(!status.gmail || (canOutlook && !status.outlook?.mail)) && (
            <details className="relative">
              <summary className="list-none cursor-pointer text-caption text-accent-text hover:underline inline-flex items-center gap-1"><Plus size={14} aria-hidden /> Añadir cuenta</summary>
              <div className="absolute right-0 mt-2 z-10 bg-surface border border-border rounded-lg p-2 shadow-md">{otherButtons()}</div>
            </details>
          )}
          {confirmOff ? (
            <span className="inline-flex items-center gap-2 text-caption">
              <span className="text-text">{provider === 'outlook' ? '¿Desconectar Microsoft? También se desconectan OneDrive y SharePoint.' : '¿Desconectar Gmail?'}</span>
              <button onClick={handleDisconnect} className="text-danger-text font-medium">Desconectar</button>
              <button onClick={() => setConfirmOff(false)} className="text-text-muted">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmOff(true)} className="text-caption text-text-muted hover:text-danger-text transition-colors">Desconectar</button>
          )}
        </span>
      </div>

      {provider && (
        <EmailAssistant user={user} plan={userDoc.plan ?? 'Abogados'} provider={provider} account={emailOf(provider)} cases={cases}
          onApiError={onApiError} onOpenEmail={handleSelectEmail} openId={selected?.id ?? loadingMsg ?? null}
          error={searchError} setError={setSearchError} />
      )}
      {loadingMsg && <p className="text-caption text-text-muted" aria-live="polite">Abriendo el email…</p>}

      {/* Email detail + analysis */}
      {selected && (
        <div id="email-detail" className="bg-surface border border-border rounded-xl overflow-hidden scroll-mt-4">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border space-y-1">
            <p className="text-body-sm font-sans font-semibold text-text-heading">{selected.subject}</p>
            <p className="text-caption text-text-muted">De: {selected.from}</p>
            <p className="text-caption text-text-muted">{parseGmailDate(selected.date)}</p>
            {selected.attachments.length > 0 && (
              <p className="text-caption text-text-muted">
                Adjuntos: {selected.attachments.map(a => a.name).join(', ')}
              </p>
            )}
          </div>

          {/* Body preview */}
          <div className="px-5 py-4 border-b border-border">
            <pre className="text-caption text-text whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
              {selected.bodyText.slice(0, 2000) || '(Sin contenido de texto)'}
            </pre>
          </div>

          {/* Analyze button */}
          {!analysis && (
            <div className="px-5 py-3 flex justify-end">
              <Button variant="accent" size="sm" loading={analyzing} onClick={handleAnalyze}>
                Analizar con IA
              </Button>
            </div>
          )}

          {/* Analysis result */}
          {analysis && (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-small font-medium text-text">{analysis.categoria}</span>
                <span className={`px-2 py-0.5 rounded text-caption font-medium border ${URGENCIA_CLS[analysis.urgencia] ?? URGENCIA_CLS.media}`}>
                  Urgencia {analysis.urgencia}
                </span>
              </div>

              <p className="text-caption text-text leading-relaxed">{analysis.resumen}</p>

              {analysis.riesgoLegal && analysis.riesgoLegal !== 'Sin riesgo aparente' && (
                <div className="bg-danger-subtle border border-status-urgente-border rounded-lg px-4 py-3">
                  <p className="text-label font-semibold uppercase tracking-widest text-danger-text mb-1">Riesgo legal</p>
                  <p className="text-caption text-danger-text">{analysis.riesgoLegal}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.partesInvolucradas?.length > 0 && (
                  <div>
                    <p className="text-label font-semibold uppercase tracking-widest text-text-muted mb-1.5">Partes</p>
                    {analysis.partesInvolucradas.map((p, i) => <p key={i} className="text-caption text-text">• {p}</p>)}
                  </div>
                )}
                {analysis.fechasClave?.length > 0 && (
                  <div>
                    <p className="text-label font-semibold uppercase tracking-widest text-text-muted mb-1.5">Fechas clave</p>
                    {analysis.fechasClave.map((f, i) => <p key={i} className="text-caption text-accent-text">• {f}</p>)}
                  </div>
                )}
                {analysis.accionesRequeridas?.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-label font-semibold uppercase tracking-widest text-text-muted mb-1.5">Acciones requeridas</p>
                    {analysis.accionesRequeridas.map((a, i) => <p key={i} className="text-caption text-warning-text">→ {a}</p>)}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 flex-wrap items-center">
                {caseSaved ? (
                  <>
                    <span className="text-caption text-success-text">Caso guardado</span>
                    <Link href={caseSaved} className="text-caption text-accent-text hover:underline">Ver caso →</Link>
                  </>
                ) : (
                  <>
                    <Button variant="accent" size="sm" onClick={() => setShowCreateCase(true)}>Crear caso</Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowLinkCase(v => !v)}>
                      Vincular a caso
                    </Button>
                  </>
                )}
                {docSaved ? (
                  <Link href="/documents" className="text-caption text-accent-text hover:underline ml-auto">Ver documento →</Link>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={savingDoc}
                    onClick={async () => {
                      if (!analysis || !selected) return;
                      setSavingDoc(true);
                      try {
                        const md = analysisToMarkdown(analysis, selected.subject, selected.from, selected.date);
                        await saveAnalysisDocument({
                          content: md,
                          title: `Análisis email — ${analysis.categoria}`,
                          userId: user.uid,
                          plan: userDoc.plan ?? 'Abogados',
                          branding: brand.word, pdfBranding: brand.pdf,
                        });
                        setDocSaved('done');
                      } catch { /* silent */ }
                      setSavingDoc(false);
                    }}
                  >
                    Guardar como documento
                  </Button>
                )}
              </div>

              {/* Link to existing case */}
              {showLinkCase && !caseSaved && (
                <div className="mt-2">
                  <p className="text-caption text-text-muted mb-2">Selecciona el caso:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {cases.map(c => (
                      <button key={c.id}
                        onClick={() => handleLinkCase(c.id)}
                        disabled={savingCase}
                        className="w-full text-left px-3 py-2 rounded-lg bg-bg border border-border hover:border-accent-border text-caption text-text transition-colors disabled:opacity-40"
                      >
                        <span className="font-medium">{c.title}</span>
                        {c.ref && <span className="text-text-muted ml-2">{c.ref}</span>}
                      </button>
                    ))}
                    {cases.length === 0 && <p className="text-caption text-text-muted">No hay casos activos.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create case modal */}
      {showCreateCase && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateCase(false)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-elevated space-y-4">
            <h2 className="font-display text-body-lg text-text-heading">Crear caso desde email</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-label font-semibold uppercase tracking-widest text-text-muted mb-1">Título</label>
                <input className={INPUT} value={caseForm.title} onChange={e => setCaseForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-label font-semibold uppercase tracking-widest text-text-muted mb-1">Tipo</label>
                <select className={INPUT} value={caseForm.type} onChange={e => setCaseForm(p => ({ ...p, type: e.target.value }))}>
                  {['civil', 'laboral', 'contractual', 'familia', 'penal', 'sucesoral', 'otro'].map(t => (
                    <option key={t} value={t} className="bg-bg capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-label font-semibold uppercase tracking-widest text-text-muted mb-1">Cliente / Contraparte</label>
                <input className={INPUT} value={caseForm.client} onChange={e => setCaseForm(p => ({ ...p, client: e.target.value }))} />
              </div>
              <div>
                <label className="block text-label font-semibold uppercase tracking-widest text-text-muted mb-1">Notas</label>
                <textarea rows={3} className={`${INPUT} resize-none`} value={caseForm.notes} onChange={e => setCaseForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="ghost" size="md" fullWidth onClick={() => setShowCreateCase(false)}>Cancelar</Button>
              <Button variant="accent" size="md" fullWidth loading={savingCase} onClick={handleCreateCase}>Crear caso</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manual tab ────────────────────────────────────────────────────────────────

function ManualTab({ user }: { user: ReturnType<typeof useAppAuth>['user'] }) {
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<EmailAnalysisResult | null>(null);
  const [error, setError]         = useState('');

  const handleAnalyze = async () => {
    if (!emailText.trim()) return setError('Introduce el contenido del email a analizar.');
    setError(''); setAnalyzing(true); setResult(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gmail/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          subject: '(análisis manual)',
          from: '',
          to: '',
          date: new Date().toISOString(),
          body: emailText,
        }),
      });
      const data = await res.json() as { result?: EmailAnalysisResult; error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data.result!);
    } catch { setError('Error al analizar el email. Intenta de nuevo.'); }
    finally { setAnalyzing(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-sans font-semibold text-small text-text-heading mb-3">Contenido del email</h3>
        <textarea rows={8} value={emailText} onChange={e => setEmailText(e.target.value)}
          placeholder="Pega aquí el contenido del email legal a analizar..."
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-small font-sans text-text  focus:border-accent-border resize-none leading-relaxed" />
        {error && <p className="mt-2 text-caption text-danger-text">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button variant="accent" size="md" loading={analyzing} onClick={handleAnalyze}>Analizar email</Button>
        </div>
      </div>

      {result && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-small font-sans font-medium text-text">{result.categoria}</span>
            <span className={`px-2 py-0.5 rounded text-caption font-medium border ${URGENCIA_CLS[result.urgencia] ?? URGENCIA_CLS.media}`}>
              Urgencia {result.urgencia}
            </span>
          </div>
          <p className="text-caption text-text-muted leading-relaxed">{result.resumen}</p>
          {[
            { label: 'Partes involucradas', items: result.partesInvolucradas, color: 'text-text' },
            { label: 'Fechas clave',        items: result.fechasClave,        color: 'text-accent-text' },
            { label: 'Acciones requeridas', items: result.accionesRequeridas, color: 'text-warning-text'  },
          ].map(({ label, items, color }) => items?.length ? (
            <div key={label}>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">{label}</p>
              <ul className="space-y-1">{items.map((item, i) => <li key={i} className={`text-caption ${color}`}>• {item}</li>)}</ul>
            </div>
          ) : null)}
          {result.riesgoLegal && result.riesgoLegal !== 'Sin riesgo aparente' && (
            <div className="bg-danger-subtle border border-status-urgente-border rounded-lg px-4 py-3">
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-danger-text mb-1">Riesgo legal</p>
              <p className="text-caption text-danger-text">{result.riesgoLegal}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RevisionEmailPage() {
  const { user, userDoc } = useAppAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'correo' | 'manual'>('correo');
  const [banner, setBanner] = useState('');

  useEffect(() => {
    const gmailOk = searchParams?.get('gmail_connected');
    const gmailErr = searchParams?.get('gmail_error');
    const ms = searchParams?.get('ms');
    if (gmailOk) setBanner('Gmail conectado correctamente.');
    else if (gmailErr) setBanner(`Error al conectar Gmail: ${gmailErr}. Intenta de nuevo.`);
    else if (ms === 'connected') setBanner('Microsoft conectado correctamente.');
    else if (ms === 'cancelled') setBanner('Error: conexión con Microsoft cancelada.');
    else if (ms) setBanner('Error al conectar con Microsoft. Intenta de nuevo.');
    if (gmailOk || gmailErr || ms) window.history.replaceState({}, '', '/tools/revision-email');
  }, [searchParams]);

  const TABS = [
    { key: 'correo', label: 'Correo' },
    { key: 'manual', label: 'Manual' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Revisión de Email"
        subtitle="Análisis jurídico e integración con casos"
        actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {banner && (
            <div className={`px-4 py-2.5 rounded-lg text-caption border ${banner.startsWith('Error') ? 'bg-danger-subtle border-status-urgente-border text-danger-text' : 'bg-success-subtle border-status-a-tiempo-border text-success-text'}`}>
              {banner}
              <button onClick={() => setBanner('')} aria-label="Cerrar" className="ml-3 opacity-60 hover:opacity-100"><X size={14} aria-hidden /></button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-caption font-sans transition-colors ${tab === t.key ? 'bg-accent-subtle text-accent-text border border-accent-border' : 'text-text-muted hover:text-text'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'correo'
            ? <GmailTab user={user} userDoc={userDoc} />
            : <ManualTab user={user} />
          }
        </div>
      </div>
    </div>
  );
}
