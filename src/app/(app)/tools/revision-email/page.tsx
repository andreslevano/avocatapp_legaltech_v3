'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCases, createCase, updateCase, type CaseDoc } from '@/lib/firestore';
import type { GmailMessage, GmailMessageFull } from '@/lib/gmail';
import type { EmailAnalysisResult } from '@/app/api/gmail/analyze/route';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseGmailDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

const URGENCIA_CLS: Record<string, string> = {
  alta:  'text-red-400 bg-red-400/10 border-red-400/20',
  media: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  baja:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

// ── Gmail tab ─────────────────────────────────────────────────────────────────

function GmailTab({ user, userDoc }: { user: ReturnType<typeof useAppAuth>['user']; userDoc: ReturnType<typeof useAppAuth>['userDoc'] }) {
  const ud = userDoc as Record<string, unknown>;
  const [connected, setConnected]     = useState<boolean>(Boolean(ud.gmailConnected));
  const [gmailEmail, setGmailEmail]   = useState<string>((ud.gmailEmail as string) ?? '');
  const [connecting, setConnecting]   = useState(false);

  // Search form
  const [keywords, setKeywords]       = useState('');
  const [fromEmail, setFromEmail]     = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [searching, setSearching]     = useState(false);
  const [messages, setMessages]       = useState<GmailMessage[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched]       = useState(false);

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

  useEffect(() => {
    if (user?.uid) getCases(user.uid).then(setCases).catch(() => {});
  }, [user?.uid]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gmail/auth', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const { url, error } = await res.json() as { url?: string; error?: string };
      if (error || !url) throw new Error(error ?? 'Error al iniciar conexión');
      window.location.href = url;
    } catch (err) {
      setSearchError((err as Error).message);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const idToken = await user.getIdToken();
    await fetch('/api/gmail/disconnect', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
    setConnected(false); setGmailEmail('');
    setMessages([]); setSelected(null); setAnalysis(null);
  };

  const buildQuery = () => {
    const parts: string[] = [];
    if (keywords.trim()) parts.push(keywords.trim());
    if (fromEmail.trim()) parts.push(`from:${fromEmail.trim()}`);
    if (dateFrom) parts.push(`after:${dateFrom.replace(/-/g, '/')}`);
    if (dateTo)   parts.push(`before:${dateTo.replace(/-/g, '/')}`);
    return parts.join(' ') || 'in:inbox';
  };

  const handleSearch = async () => {
    setSearching(true); setSearchError(''); setSelected(null); setAnalysis(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gmail/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ query: buildQuery(), maxResults: 20 }),
      });
      const data = await res.json() as { messages?: GmailMessage[]; error?: string };
      if (data.error) {
        if (data.error === 'token_expired') { setConnected(false); setSearchError('Sesión de Gmail expirada. Reconecta tu cuenta.'); }
        else setSearchError(data.error);
      } else {
        setMessages(data.messages ?? []);
        setSearched(true);
      }
    } catch { setSearchError('Error al buscar emails.'); }
    finally { setSearching(false); }
  };

  const handleSelectEmail = useCallback(async (id: string) => {
    setLoadingMsg(id); setSelected(null); setAnalysis(null); setCaseSaved('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gmail/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ messageId: id }),
      });
      const data = await res.json() as { message?: GmailMessageFull; error?: string };
      if (data.error) throw new Error(data.error);
      setSelected(data.message!);
    } catch (err) { setSearchError((err as Error).message); }
    finally { setLoadingMsg(''); }
  }, [user]);

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

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-5">
        <div className="w-14 h-14 rounded-2xl bg-[#1e1c16] border border-[#2e2b20] flex items-center justify-center text-2xl">✉️</div>
        <div>
          <p className="text-[15px] font-sans font-semibold text-[#e8d4a0] mb-1">Conecta tu cuenta de Gmail</p>
          <p className="text-[12px] text-[#6b6050] leading-relaxed">
            Autoriza acceso de solo lectura a tu Gmail para buscar, analizar y vincular emails a tus casos.
          </p>
        </div>
        <Button variant="BtnGold" size="md" loading={connecting} onClick={handleConnect}>
          Conectar Gmail
        </Button>
        {searchError && <p className="text-[12px] text-red-400">{searchError}</p>}
        <p className="text-[10px] text-[#3a3630]">
          Avocat solo lee tus emails — nunca envía ni modifica nada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection badge */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1c16] border border-[#2e2b20] rounded-xl">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[12px] text-[#c8c0ac]">Conectado como <strong className="text-[#e8d4a0]">{gmailEmail}</strong></span>
        </div>
        <button onClick={handleDisconnect} className="text-[11px] text-[#6b6050] hover:text-red-400 transition-colors">
          Desconectar
        </button>
      </div>

      {/* Search form */}
      <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
        <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Criterios de búsqueda</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#6b6050] mb-1">Palabras clave</label>
            <input className={INPUT} placeholder="Ej: contrato, demanda, requerimiento..." value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6050] mb-1">De (remitente)</label>
            <input className={INPUT} placeholder="ejemplo@dominio.com" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6050] mb-1">Desde</label>
            <input type="date" className={INPUT} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6050] mb-1">Hasta</label>
            <input type="date" className={INPUT} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        {searchError && <p className="text-[12px] text-red-400">{searchError}</p>}
        <div className="flex justify-end">
          <Button variant="BtnGold" size="sm" loading={searching} onClick={handleSearch}>Buscar emails</Button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2e2b20]">
            <span className="text-[12px] text-[#6b6050]">
              {messages.length === 0 ? 'Sin resultados' : `${messages.length} email${messages.length !== 1 ? 's' : ''} encontrado${messages.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          {messages.length > 0 && (
            <div className="divide-y divide-[#2e2b20]">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`px-5 py-3 flex items-start gap-4 hover:bg-[#252218] transition-colors cursor-pointer ${selected?.id === m.id ? 'bg-[#252218]' : ''}`}
                  onClick={() => handleSelectEmail(m.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {m.hasAttachments && <span className="text-[10px] text-[#6b6050]">📎</span>}
                      <p className="text-[13px] font-medium text-[#e8d4a0] truncate">{m.subject}</p>
                    </div>
                    <p className="text-[11px] text-[#6b6050] truncate">{m.from}</p>
                    <p className="text-[11px] text-[#3a3630] mt-0.5 line-clamp-1">{m.snippet}</p>
                  </div>
                  <span className="text-[10px] text-[#3a3630] shrink-0 whitespace-nowrap">{parseGmailDate(m.date)}</span>
                  {loadingMsg === m.id && (
                    <div className="h-4 w-4 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email detail + analysis */}
      {selected && (
        <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#2e2b20] space-y-1">
            <p className="text-[14px] font-sans font-semibold text-[#e8d4a0]">{selected.subject}</p>
            <p className="text-[11px] text-[#6b6050]">De: {selected.from}</p>
            <p className="text-[11px] text-[#6b6050]">{parseGmailDate(selected.date)}</p>
            {selected.attachments.length > 0 && (
              <p className="text-[11px] text-[#6b6050]">
                Adjuntos: {selected.attachments.map(a => a.name).join(', ')}
              </p>
            )}
          </div>

          {/* Body preview */}
          <div className="px-5 py-4 border-b border-[#2e2b20]">
            <pre className="text-[12px] text-[#c8c0ac] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
              {selected.bodyText.slice(0, 2000) || '(Sin contenido de texto)'}
            </pre>
          </div>

          {/* Analyze button */}
          {!analysis && (
            <div className="px-5 py-3 flex justify-end">
              <Button variant="BtnGold" size="sm" loading={analyzing} onClick={handleAnalyze}>
                Analizar con IA
              </Button>
            </div>
          )}

          {/* Analysis result */}
          {analysis && (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[13px] font-medium text-[#c8c0ac]">{analysis.categoria}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${URGENCIA_CLS[analysis.urgencia] ?? URGENCIA_CLS.media}`}>
                  Urgencia {analysis.urgencia}
                </span>
              </div>

              <p className="text-[12px] text-[#c8c0ac] leading-relaxed">{analysis.resumen}</p>

              {analysis.riesgoLegal && analysis.riesgoLegal !== 'Sin riesgo aparente' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-red-400 mb-1">Riesgo legal</p>
                  <p className="text-[12px] text-red-400">{analysis.riesgoLegal}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.partesInvolucradas?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Partes</p>
                    {analysis.partesInvolucradas.map((p, i) => <p key={i} className="text-[12px] text-[#c8c0ac]">• {p}</p>)}
                  </div>
                )}
                {analysis.fechasClave?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Fechas clave</p>
                    {analysis.fechasClave.map((f, i) => <p key={i} className="text-[12px] text-avocat-gold">• {f}</p>)}
                  </div>
                )}
                {analysis.accionesRequeridas?.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Acciones requeridas</p>
                    {analysis.accionesRequeridas.map((a, i) => <p key={i} className="text-[12px] text-amber-400">→ {a}</p>)}
                  </div>
                )}
              </div>

              {caseSaved ? (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-[12px] text-emerald-400">Caso guardado correctamente</span>
                  <Link href={caseSaved} className="text-[12px] text-avocat-gold hover:underline">Ver caso →</Link>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button variant="BtnGold" size="sm" onClick={() => setShowCreateCase(true)}>Crear caso</Button>
                  <Button variant="BtnOutlineDark" size="sm" onClick={() => setShowLinkCase(v => !v)}>
                    Vincular a caso existente
                  </Button>
                </div>
              )}

              {/* Link to existing case */}
              {showLinkCase && !caseSaved && (
                <div className="mt-2">
                  <p className="text-[11px] text-[#6b6050] mb-2">Selecciona el caso:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {cases.map(c => (
                      <button key={c.id}
                        onClick={() => handleLinkCase(c.id)}
                        disabled={savingCase}
                        className="w-full text-left px-3 py-2 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 text-[12px] text-[#c8c0ac] transition-colors disabled:opacity-40"
                      >
                        <span className="font-medium">{c.title}</span>
                        {c.ref && <span className="text-[#6b6050] ml-2">{c.ref}</span>}
                      </button>
                    ))}
                    {cases.length === 0 && <p className="text-[12px] text-[#6b6050]">No hay casos activos.</p>}
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
          <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-6 w-full max-w-md shadow-elevated space-y-4">
            <h2 className="font-display text-[18px] text-[#e8d4a0]">Crear caso desde email</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Título</label>
                <input className={INPUT} value={caseForm.title} onChange={e => setCaseForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Tipo</label>
                <select className={INPUT} value={caseForm.type} onChange={e => setCaseForm(p => ({ ...p, type: e.target.value }))}>
                  {['civil', 'laboral', 'contractual', 'familia', 'penal', 'sucesoral', 'otro'].map(t => (
                    <option key={t} value={t} className="bg-[#161410] capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Cliente / Contraparte</label>
                <input className={INPUT} value={caseForm.client} onChange={e => setCaseForm(p => ({ ...p, client: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Notas</label>
                <textarea rows={3} className={`${INPUT} resize-none`} value={caseForm.notes} onChange={e => setCaseForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="BtnGhost" size="md" fullWidth onClick={() => setShowCreateCase(false)}>Cancelar</Button>
              <Button variant="BtnGold" size="md" fullWidth loading={savingCase} onClick={handleCreateCase}>Crear caso</Button>
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
      <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
        <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0] mb-3">Contenido del email</h3>
        <textarea rows={8} value={emailText} onChange={e => setEmailText(e.target.value)}
          placeholder="Pega aquí el contenido del email legal a analizar..."
          className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed" />
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button variant="BtnGold" size="md" loading={analyzing} onClick={handleAnalyze}>Analizar email</Button>
        </div>
      </div>

      {result && (
        <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-sans font-medium text-[#c8c0ac]">{result.categoria}</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${URGENCIA_CLS[result.urgencia] ?? URGENCIA_CLS.media}`}>
              Urgencia {result.urgencia}
            </span>
          </div>
          <p className="text-[12px] text-[#6b6050] leading-relaxed">{result.resumen}</p>
          {[
            { label: 'Partes involucradas', items: result.partesInvolucradas, color: 'text-[#c8c0ac]' },
            { label: 'Fechas clave',        items: result.fechasClave,        color: 'text-avocat-gold' },
            { label: 'Acciones requeridas', items: result.accionesRequeridas, color: 'text-amber-400'  },
          ].map(({ label, items, color }) => items?.length ? (
            <div key={label}>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">{label}</p>
              <ul className="space-y-1">{items.map((item, i) => <li key={i} className={`text-[12px] ${color}`}>• {item}</li>)}</ul>
            </div>
          ) : null)}
          {result.riesgoLegal && result.riesgoLegal !== 'Sin riesgo aparente' && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-red-400 mb-1">Riesgo legal</p>
              <p className="text-[12px] text-red-400">{result.riesgoLegal}</p>
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
  const [tab, setTab] = useState<'gmail' | 'manual'>('gmail');
  const [banner, setBanner] = useState('');

  useEffect(() => {
    const connected = searchParams.get('gmail_connected');
    const error     = searchParams.get('gmail_error');
    if (connected) {
      setBanner('Gmail conectado correctamente.');
      // Update URL without param
      window.history.replaceState({}, '', '/tools/revision-email');
    } else if (error) {
      setBanner(`Error al conectar Gmail: ${error}. Intenta de nuevo.`);
      window.history.replaceState({}, '', '/tools/revision-email');
    }
  }, [searchParams]);

  const TABS = [
    { key: 'gmail',  label: '✉️  Gmail' },
    { key: 'manual', label: '📋  Manual' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Revisión de Email"
        subtitle="Análisis jurídico e integración con casos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {banner && (
            <div className={`px-4 py-2.5 rounded-lg text-[12px] border ${banner.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              {banner}
              <button onClick={() => setBanner('')} className="ml-3 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-sans transition-colors ${tab === t.key ? 'bg-avocat-gold/15 text-avocat-gold border border-avocat-gold/30' : 'text-[#6b6050] hover:text-[#c8c0ac]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'gmail'
            ? <GmailTab user={user} userDoc={userDoc} />
            : <ManualTab user={user} />
          }
        </div>
      </div>
    </div>
  );
}
