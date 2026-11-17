'use client';

// "Firma manuscrita" inside "Firmar y enviar": the owner's handwritten signature (Perfil → Firma
// manuscrita) is stamped in the first signature block of the saved document; a signed copy (Word +
// PDF) is saved in Documentos and emailed to the other parties, who sign by hand and reply.
// Stamping: src/lib/doc-html.ts stampOwnerSignature · email: /api/signatures/manual.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocBranding } from '@/hooks/useDocBranding';
import { Button } from '@/components/ui/Button';
import { stampOwnerSignature } from '@/lib/doc-html';
import { buildPdfBlobFromHtml } from '@/lib/agent-export';
import { getDocumentById, saveDocumentToStorage, type DocumentRecord } from '@/lib/storage-client';
import { EMAIL_RE } from '@/lib/signatures/types';
import { MANUAL_MAX_CC, MANUAL_MAX_RECIPIENTS } from '@/lib/signatures/manual';

interface Props {
  documentId: string;
  title: string;
  defaultRecipients: { name: string; email: string }[];
  defaultCc?: { name: string; email: string }[];
  language: 'es' | 'en';
  onClose: () => void;
  onBack: () => void;
}

interface Row { key: number; name: string; email: string }
let seq = 0;
const row = (x: { name: string; email: string }): Row => ({ key: ++seq, name: x.name, email: x.email });

const FIELD = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text focus:border-accent-border';
const LABEL = 'block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1';

function today(lang: 'es' | 'en') {
  return new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ManualSignPanel(p: Props) {
  const { user, userDoc } = useAppAuth();
  const { owner } = useDocBranding();                       // live: a signature drawn in Perfil shows up here
  const signatureUrl = ((owner as Record<string, unknown>).signatureUrl as string | undefined) ?? '';
  const ownerName = String((owner as Record<string, unknown>).displayName ?? userDoc.displayName ?? user.email ?? '');

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [to, setTo] = useState<Row[]>(() => (p.defaultRecipients.length ? p.defaultRecipients : [{ name: '', email: '' }]).map(row));
  const [cc, setCc] = useState<Row[]>(() => (p.defaultCc ?? []).map(row));
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(() => {
    const first = p.defaultRecipients[0]?.name.trim().split(/\s+/)[0];
    return `Hola${first ? ` ${first}` : ''},\n\nTe envío «${p.title}» firmado por mí. Fírmalo en tu bloque de firma y devuélvemelo respondiendo a este email.\n\nGracias,\n${ownerName}`;
  });
  const [busy, setBusy] = useState<'' | 'pdf' | 'save' | 'send'>('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getDocumentById(p.documentId);
        if (!d) throw new Error('Documento no encontrado.');
        const res = await fetch(d.downloadUrl);
        if (!res.ok) throw new Error('No se pudo abrir el documento.');
        const text = await res.text();
        if (alive) { setDoc(d); setSaved(text); }
      } catch (e) { if (alive) setLoadError((e as Error).message); }
    })();
    return () => { alive = false; };
  }, [p.documentId]);

  const signerNames = [ownerName, ...to.map(r => r.name.trim() || r.email.trim())];
  const html = useMemo(
    () => (saved && signatureUrl ? stampOwnerSignature(saved, signatureUrl, today(p.language), signerNames, p.language) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved, signatureUrl, p.language, signerNames.join('|')],
  );

  const invalid = (): string => {
    if (!to.length) return 'Añade al menos un destinatario.';
    for (const r of to) if (!EMAIL_RE.test(r.email.trim())) return `Revisa el email${r.name.trim() ? ` de ${r.name.trim()}` : ''}.`;
    for (const r of cc) if (!EMAIL_RE.test(r.email.trim())) return 'Revisa los emails en copia.';
    const emails = [...to, ...cc].map(r => r.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) return 'Cada persona debe tener un email distinto.';
    if (user.email && emails.includes(user.email.toLowerCase())) return 'No te añadas: recibirás una copia del envío.';
    return '';
  };

  const send = async () => {
    setError('');
    const msg = invalid();
    if (msg) return setError(msg);
    if (!html || !doc) return setError('El documento no está listo.');
    let stage: 'pdf' | 'save' | 'send' = 'pdf';
    try {
      setBusy('pdf');
      const base = p.title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '_') || 'Documento';
      // The email carries only the PDF: without it nothing is sent.
      const pdf = await buildPdfBlobFromHtml(html, p.title).catch(() => null);
      if (!pdf) throw new Error('No se pudo generar el PDF. Intenta de nuevo.');
      stage = 'save'; setBusy('save');
      const record = await saveDocumentToStorage({
        userId: user.uid, plan: userDoc.plan ?? 'Abogados',
        blob: new Blob(['﻿' + html], { type: 'application/msword' }),
        name: `${base}_firmado.doc`, caseId: doc.caseId ?? null, source: 'generated',
        pdfBlob: pdf.blob,
      });
      stage = 'send'; setBusy('send');
      const token = await user.getIdToken();
      const res = await fetch('/api/signatures/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          documentId: p.documentId, signedDocumentId: record.id,
          recipients: to.map(r => ({ name: r.name.trim(), email: r.email.trim() })),
          cc: cc.map(r => ({ name: r.name.trim(), email: r.email.trim() })),
          subject: subject.trim(), message,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar.');
      setSent(to.map(r => r.email.trim()));
    } catch (e) {
      setError(`${(e as Error).message}${stage === 'send' ? ' La copia firmada ya está en Documentos.' : ''}`);
    } finally {
      setBusy('');
    }
  };

  if (sent) {
    return (
      <div className="space-y-3 text-small" role="status">
        <p className="flex items-center gap-2 text-success-text font-semibold"><CheckCircle2 size={18} aria-hidden /> Enviado</p>
        <p className="text-text">Hemos enviado «{p.title}» firmado por ti a {sent.join(', ')}, con el PDF adjunto. Recibirás una copia.</p>
        <p className="text-text-muted">La copia firmada está en Documentos. Cuando te la devuelvan firmada, súbela allí.</p>
        <div className="flex justify-end"><Button variant="accent" size="sm" onClick={p.onClose}>Cerrar</Button></div>
      </div>
    );
  }

  if (!signatureUrl) {
    return (
      <div className="space-y-3 text-small">
        <p className="text-text">Aún no tienes una firma manuscrita guardada.</p>
        <p className="text-text-muted">Dibújala una vez en tu perfil y la usaremos en tus documentos.</p>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={p.onBack}>Volver</Button>
          <Button href="/settings/perfil" variant="accent" size="sm">Dibujar mi firma en Perfil</Button>
        </div>
      </div>
    );
  }

  const rowEditor = (rows: Row[], set: (r: Row[]) => void, kind: 'to' | 'cc') => (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.key} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input aria-label="Nombre" placeholder="Nombre" value={r.name} className={FIELD}
            onChange={e => set(rows.map(x => x.key === r.key ? { ...x, name: e.target.value } : x))} />
          <input aria-label="Email" type="email" placeholder="email@ejemplo.com" value={r.email} className={FIELD}
            onChange={e => set(rows.map(x => x.key === r.key ? { ...x, email: e.target.value } : x))} />
          <button type="button" aria-label="Quitar" disabled={kind === 'to' && rows.length === 1}
            onClick={() => set(rows.filter(x => x.key !== r.key))}
            className="p-2 rounded-md text-text-muted hover:text-text disabled:opacity-30"><X size={16} aria-hidden /></button>
        </div>
      ))}
      {rows.length < (kind === 'to' ? MANUAL_MAX_RECIPIENTS : MANUAL_MAX_CC) && (
        <button type="button" onClick={() => set([...rows, row({ name: '', email: '' })])}
          className="inline-flex items-center gap-1 text-caption text-accent-text hover:underline">
          <Plus size={16} aria-hidden /> {kind === 'to' ? 'Añadir destinatario' : 'Añadir copia'}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 text-caption font-sans">
      <section className="space-y-1">
        <p className={LABEL}>1 · Tu firma</p>
        <div className="flex items-center gap-3">
          <span data-theme="light" className="inline-flex bg-surface rounded border border-border-strong p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="Tu firma manuscrita" className="h-10 max-w-[160px] object-contain" />
          </span>
          <p className="text-text-muted">Se colocará en el primer bloque de firma, con la fecha de hoy. <Link href="/settings/perfil" className="text-accent-text underline">Cambiar</Link></p>
        </div>
      </section>

      <section className="space-y-1">
        <p className={LABEL}>Vista previa</p>
        <div className="h-56 rounded-lg border border-border bg-bg overflow-hidden">
          {loadError ? <p className="p-3 text-danger-text">{loadError}</p>
            : html ? <iframe title="Documento firmado" sandbox="" className="w-full h-full border-0 bg-surface-raised"
                srcDoc={html.replace('</head>', '<style>html{zoom:.5}body{margin:0;padding:1cm 1.2cm}</style></head>')} />
            : saved ? <p className="p-3 text-danger-text">Este documento no se puede firmar así: no es un documento generado en Avocat.</p>
            : <p className="p-3 text-text-muted">Cargando…</p>}
        </div>
      </section>

      <section className="space-y-1">
        <p className={LABEL}>2 · Se lo enviamos por email</p>
        {rowEditor(to, setTo, 'to')}
        <p className="text-text-muted">Recibirán el PDF para firmarlo a mano y devolvértelo respondiendo al email.</p>
      </section>

      <details className="space-y-2">
        <summary className="cursor-pointer text-text">Copia, asunto y mensaje</summary>
        <div className="space-y-3 pt-2">
          <div><p className={LABEL}>En copia</p>{rowEditor(cc, setCc, 'cc')}</div>
          <div>
            <label htmlFor="manual-subject" className={LABEL}>Asunto</label>
            <input id="manual-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
              placeholder={`${ownerName} te envía «${p.title}» firmado`} className={FIELD} />
          </div>
          <div>
            <label htmlFor="manual-message" className={LABEL}>Mensaje</label>
            <textarea id="manual-message" rows={5} value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} className={FIELD} />
          </div>
        </div>
      </details>

      {error && <p role="alert" className="text-danger-text">{error}</p>}

      <div className="flex justify-between gap-2 pt-1">
        <Button variant="ghost" size="sm" disabled={!!busy} onClick={p.onBack}>Volver</Button>
        <Button variant="accent" size="sm" disabled={!html} loading={!!busy}
          loadingText={busy === 'pdf' ? 'Preparando el PDF…' : busy === 'save' ? 'Guardando la copia firmada…' : 'Enviando…'}
          onClick={send}>
          Firmar y enviar →
        </Button>
      </div>
    </div>
  );
}
