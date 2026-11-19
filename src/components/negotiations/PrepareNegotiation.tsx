'use client';

// /negociaciones/nueva?draft={documentId} — "Preparar": the 14 clauses with their level
// (Modificable · Negociable · No modificable; playbook defaults), the recipient, "Mostrar los niveles
// al tercero", a preview of the selected clause with the BORRADOR mark, and "Enviar a revisión".
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { splitClauses } from '@/lib/negotiations/clauses';
import { CLAUSE_LEVELS, defaultLevel, LEVEL_HELP, LEVEL_LABEL, MFW_PLAYBOOK, type ClauseLevel } from '@/lib/negotiations/levels';
import { clearDraft, createNegotiation, NegotiationClientError, type DraftHandoff, type SentResult } from '@/lib/negotiations/client';
import { DRAFT_MARK } from '@/lib/doc-html';
import { ClauseText, LevelBadge } from './shared';

const INPUT = 'w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-body-sm text-text';

export default function PrepareNegotiation({ draft }: { draft: DraftHandoff }) {
  const { user } = useAppAuth();
  const router = useRouter();
  const split = useMemo(() => splitClauses(draft.markdown, MFW_PLAYBOOK.clauseCount), [draft.markdown]);
  const [levels, setLevels] = useState<Record<string, ClauseLevel>>(() =>
    split.ok ? Object.fromEntries(split.clauses.map(c => [c.key, defaultLevel(MFW_PLAYBOOK, c.n)])) : {});
  const [selected, setSelected] = useState('c1');
  const [name, setName] = useState(draft.counterparty.name);
  const [email, setEmail] = useState(draft.counterparty.email);
  const [company, setCompany] = useState(draft.counterparty.company ?? '');
  const [showLevels, setShowLevels] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<SentResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!split.ok) {
    return <Alert tone="danger" title="No se pudo preparar la negociación">{split.error} Vuelve a generar el borrador desde el NDA.</Alert>;
  }
  const clause = split.clauses.find(c => c.key === selected) ?? split.clauses[0];
  const count = (l: ClauseLevel) => Object.values(levels).filter(v => v === l).length;

  const send = async () => {
    setError('');
    if (!name.trim()) return setError('Indica el nombre de quien revisará el NDA.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Revisa el email de quien revisará el NDA.');
    setBusy(true);
    try {
      const r = await createNegotiation(user, {
        draftDocumentId: draft.documentId, markdown: draft.markdown, levels, showLevels, clientId: draft.clientId,
        counterparty: { name: name.trim(), email: email.trim(), ...(company.trim() ? { company: company.trim() } : {}) },
      });
      clearDraft(draft.documentId);
      if (r.emailed) router.replace(`/negociaciones/${encodeURIComponent(r.id)}?enviado=1`);
      else setDone(r);
    } catch (e) {
      setError(e instanceof NegotiationClientError ? e.message : 'No se pudo enviar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="flex items-center gap-2 text-small font-semibold text-success-text"><CheckCircle2 size={18} aria-hidden /> Negociación creada</p>
        <p className="text-small text-text">
          {done.emailConfigured ? 'No se pudo enviar el email.' : 'El envío de emails no está configurado.'} Envía este enlace a {name} por otro medio
          (solo se muestra ahora; caduca en 14 días):
        </p>
        {done.link && (
          <div className="flex gap-2">
            <input readOnly value={done.link} aria-label="Enlace de revisión" className={`${INPUT} font-mono text-caption`} onFocus={e => e.currentTarget.select()} />
            <Button variant="secondary" size="md" icon={Copy} onClick={() => { navigator.clipboard.writeText(done.link!); setCopied(true); }}>{copied ? 'Copiado' : 'Copiar'}</Button>
          </div>
        )}
        <Button variant="accent" size="md" href={`/negociaciones/${encodeURIComponent(done.id)}`}>Ir a la negociación</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <section aria-labelledby="prep-clauses" className="bg-surface border border-border rounded-xl">
        <div className="px-4 py-3 border-b border-border">
          <h2 id="prep-clauses" className="font-sans text-small font-semibold text-text-heading">Cláusulas y nivel de negociación</h2>
          <p className="text-caption text-text-muted">Valores propuestos por la plantilla (pendientes de validación legal). Puedes cambiarlos para este NDA.</p>
        </div>
        <ol className="divide-y divide-border">
          {split.clauses.map(c => (
            <li key={c.key} className={`px-4 py-3 space-y-2 ${selected === c.key ? 'bg-surface-muted' : ''}`}>
              <button type="button" onClick={() => setSelected(c.key)} aria-current={selected === c.key ? 'true' : undefined}
                className="w-full text-left min-h-touch sm:min-h-0 text-small text-text hover:text-accent-text">
                <span className="font-semibold">{c.n}.</span> {c.heading}
              </button>
              <fieldset>
                <legend className="sr-only">Nivel de la cláusula {c.n}</legend>
                <div className="inline-flex flex-wrap gap-1 p-1 rounded-lg bg-surface-muted">
                  {CLAUSE_LEVELS.map(l => (
                    <label key={l} title={LEVEL_HELP[l]}
                      className={`inline-flex items-center min-h-touch sm:min-h-0 sm:h-8 px-3 rounded-md text-caption font-medium cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${levels[c.key] === l ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
                      <input type="radio" className="sr-only" name={`level-${c.key}`} value={l} checked={levels[c.key] === l}
                        onChange={() => { setLevels(p => ({ ...p, [c.key]: l })); setSelected(c.key); }} />
                      {LEVEL_LABEL[l]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-5 lg:sticky lg:top-4 self-start">
        <section aria-labelledby="prep-preview" className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <h2 id="prep-preview" className="font-sans text-small font-semibold text-text-heading">Cláusula {clause.n}</h2>
            <LevelBadge level={levels[clause.key]} />
          </div>
          <div data-theme="light" className="bg-surface px-5 py-4 max-h-[360px] overflow-y-auto font-document text-body-sm text-text space-y-3">
            <p className="text-center text-caption font-sans font-bold tracking-widest text-danger-text border-2 border-danger rounded-sm py-1">{DRAFT_MARK}</p>
            <p className="font-semibold uppercase">Cláusula {clause.n}. {clause.heading}</p>
            <ClauseText text={clause.text} />
          </div>
        </section>

        <section aria-labelledby="prep-send" className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <h2 id="prep-send" className="font-sans text-small font-semibold text-text-heading">Enviar a revisión</h2>
          <ul className="flex flex-wrap gap-2" aria-label="Resumen de niveles">
            {CLAUSE_LEVELS.map(l => (
              <li key={l} className="inline-flex items-center gap-1.5 text-caption text-text"><LevelBadge level={l} /> {count(l)}</li>
            ))}
          </ul>
          <div className="space-y-3">
            <div>
              <label htmlFor="cp-name" className="block text-small font-medium text-text mb-1">Nombre de quien revisa</label>
              <input id="cp-name" className={INPUT} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="cp-email" className="block text-small font-medium text-text mb-1">Email</label>
              <input id="cp-email" type="email" className={INPUT} value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="cp-company" className="block text-small font-medium text-text mb-1">Empresa <span className="text-text-muted font-normal">(opcional)</span></label>
              <input id="cp-company" className={INPUT} value={company} onChange={e => setCompany(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <label className="flex items-start gap-3 min-h-touch cursor-pointer">
            <button type="button" role="switch" aria-checked={showLevels} onClick={() => setShowLevels(v => !v)}
              className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border transition-colors ${showLevels ? 'bg-accent border-accent-border' : 'bg-surface-muted border-border-strong'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition-all ${showLevels ? 'left-6' : 'left-0.5'}`} />
            </button>
            <span className="text-small text-text">
              Mostrar los niveles al tercero
              <span className="block text-caption text-text-muted">Si lo desactivas, no verá qué cláusulas son negociables (las no modificables siguen sin admitir cambios).</span>
            </span>
          </label>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button variant="accent" size="md" block icon={Send} loading={busy} loadingText="Enviando…" onClick={send}>Enviar a revisión</Button>
          <p className="text-caption text-text-muted">
            Recibirá un enlace seguro (caduca en 14 días). Nada se firma hasta que acordéis la versión final.{' '}
            <Link href="/documents" className="underline text-accent-text">El borrador está en Documentos</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
