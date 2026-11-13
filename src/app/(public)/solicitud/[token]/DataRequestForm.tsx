'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Link2Off, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { COMPANY_FIELDS, ID_TYPES, fieldsFor, labelFor, type DocId, type FieldKey, type PersonType } from '@/lib/data-requests/catalog';
import { validateSubmission } from '@/lib/data-requests/core';
import { formatContractDate } from '@/lib/contracts/dates';

type View =
  | { status: 'invalida' | 'caducada' | 'revocada' | 'completada'; ownerName?: string }
  | {
      status: 'enviada' | 'abierta';
      ownerName: string;
      documents: { id: DocId; label: string }[];
      askPersonType: boolean;
      fields: { key: FieldKey; label: string }[];
      prefill: { name: string; email: string };
      expiresAt: string;
    };

const INPUT = 'w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-body-sm text-text';
const INPUT_ERR = 'border-danger';

function listPhrase(items: string[]) {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function StateMessage({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center space-y-3 py-6">
      <Icon size={40} className="mx-auto text-accent-text" aria-hidden />
      <h1 className="font-display text-h2 text-text-heading">{title}</h1>
      <div className="text-body-sm text-text-muted max-w-md mx-auto space-y-2">{children}</div>
    </div>
  );
}

export default function DataRequestForm({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [personType, setPersonType] = useState<PersonType | ''>('');
  const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey | 'consent', string>>>({});
  const [warnings, setWarnings] = useState<Partial<Record<FieldKey, string>>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`/api/data-requests/public/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((v: View) => {
        setView(v);
        if (v.status === 'enviada' || v.status === 'abierta') {
          setValues({ name: v.prefill.name, email: v.prefill.email, idType: 'DNI' });
          if (!v.askPersonType) setPersonType('persona');
        }
      })
      .catch(() => setLoadError(true));
  }, [token]);

  const open = view && (view.status === 'enviada' || view.status === 'abierta') ? view : null;
  const docIds = useMemo(() => open?.documents.map(d => d.id) ?? [], [open]);
  const visible = useMemo(
    () => (personType ? fieldsFor(docIds, personType).filter(f => f !== 'personType') : []),
    [docIds, personType],
  );
  const personal = visible.filter(f => !COMPANY_FIELDS.includes(f));
  const company = visible.filter(f => COMPANY_FIELDS.includes(f));

  if (loadError) {
    return <Shell><Alert tone="danger" title="No pudimos cargar el formulario">Revisa tu conexión y vuelve a abrir el enlace.</Alert></Shell>;
  }
  if (!view) return <Shell><p className="text-body-sm text-text-muted text-center py-10">Cargando…</p></Shell>;

  if (done) {
    return (
      <Shell>
        <StateMessage icon={CheckCircle2} title="Gracias">
          <p>{done} revisará los documentos y te los enviará para firmar.</p>
          <p>Ya puedes cerrar esta página.</p>
        </StateMessage>
      </Shell>
    );
  }
  if (!open) {
    const who = view.ownerName ?? 'quien te lo envió';
    const msg = {
      completada: { icon: CheckCircle2, title: 'Ya enviaste tus datos', body: `${who} los ha recibido y te enviará los documentos para firmar.` },
      caducada: { icon: Clock, title: 'Este enlace ha caducado', body: `Pide a ${who} que te envíe uno nuevo.` },
      revocada: { icon: Link2Off, title: 'Este enlace ya no está activo', body: `${who} ha anulado la solicitud. Si crees que es un error, contacta con quien te la envió.` },
      invalida: { icon: Link2Off, title: 'Enlace no válido', body: 'Revisa que has abierto el último enlace que te enviaron. Si te mandaron uno nuevo, el anterior deja de funcionar.' },
    }[view.status as 'completada' | 'caducada' | 'revocada' | 'invalida'];
    return <Shell><StateMessage icon={msg.icon} title={msg.title}><p>{msg.body}</p></StateMessage></Shell>;
  }

  const set = (f: FieldKey, v: string) => {
    setValues(p => ({ ...p, [f]: v }));
    if (errors[f]) setErrors(e => ({ ...e, [f]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const body = { ...values, personType: open.askPersonType ? personType : 'persona', consent };
    const local = validateSubmission(docIds, body);
    const errs: typeof errors = { ...local.errors };
    if (!consent) errs.consent = 'Acepta el aviso de privacidad para continuar.';
    setWarnings(local.warnings);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = Object.keys(errs)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/data-requests/public/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const r = await res.json().catch(() => ({}));
      if (r.ok) setDone(r.ownerName || open.ownerName);
      else if (r.status === 'invalid_input') setErrors(r.errors ?? {});
      else if (r.status) setView({ status: r.status, ownerName: open.ownerName });
      else setSubmitError(r.error || 'No pudimos enviar tus datos. Inténtalo de nuevo.');
    } catch {
      setSubmitError('No pudimos enviar tus datos. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const field = (f: FieldKey) => {
    const base = labelFor(f);
    // The name hint is about companies: only useful when signing for one.
    const l = f === 'name' && personType !== 'sociedad' ? { ...base, help: undefined } : base;
    const id = `f-${f}`;
    const err = errors[f];
    const warn = !err ? warnings[f] : undefined;
    const label = f === 'name' && personType === 'sociedad' ? 'Nombre y apellidos de quien firma' : f === 'address' && personType === 'sociedad' ? 'Tu domicilio' : l.label;
    const describedBy = [l.help ? `${id}-help` : '', err || warn ? `${id}-msg` : ''].filter(Boolean).join(' ') || undefined;
    const common = {
      id, 'aria-invalid': err ? true : undefined, 'aria-describedby': describedBy,
      className: `${INPUT} ${err ? INPUT_ERR : ''}`,
    };
    return (
      <div key={f}>
        <label htmlFor={id} className="block text-small font-medium text-text mb-1">
          {label}{!l.optional && <span className="text-danger-text" aria-hidden> *</span>}
        </label>
        {f === 'idType' ? (
          <select {...common} value={values.idType ?? 'DNI'} onChange={e => set('idType', e.target.value)}>
            {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : f === 'powers' ? (
          <textarea {...common} className={`${common.className} h-auto min-h-[88px] py-2`} value={values[f] ?? ''} placeholder={l.placeholder}
            onChange={e => set(f, e.target.value)} maxLength={300} />
        ) : (
          <input {...common} value={values[f] ?? ''} placeholder={l.placeholder}
            type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'}
            autoComplete={({ name: 'name', email: 'email', phone: 'tel', address: 'street-address', company: 'organization', representativeCapacity: 'organization-title' } as Partial<Record<FieldKey, string>>)[f]}
            onChange={e => set(f, e.target.value)} />
        )}
        {l.help && <p id={`${id}-help`} className="mt-1 text-caption text-text-muted">{l.help}</p>}
        {(err || warn) && <p id={`${id}-msg`} className={`mt-1 text-caption ${err ? 'text-danger-text' : 'text-warning-text'}`}>{err || warn}</p>}
      </div>
    );
  };

  const docs = listPhrase(open.documents.map(d => d.label));
  return (
    <Shell>
      <header className="space-y-2 mb-6">
        <p className="text-label uppercase tracking-widest text-text-muted">Solicitud de datos</p>
        <h1 className="font-display text-h2 text-text-heading">{open.ownerName} te ha pedido estos datos para preparar: {docs}</h1>
        <p className="text-body-sm text-text-muted">Tardarás unos dos minutos. No necesitas crear una cuenta. El enlace caduca el {formatContractDate(open.expiresAt.slice(0, 10))}.</p>
      </header>

      <form onSubmit={submit} noValidate className="space-y-5">
        {open.askPersonType && (
          <fieldset aria-describedby={errors.personType ? 'f-personType-msg' : undefined}>
            <legend className="text-small font-medium text-text mb-2">{labelFor('personType').label}<span className="text-danger-text" aria-hidden> *</span></legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([['persona', 'Persona física', 'Firmo en mi propio nombre.'], ['sociedad', 'En nombre de una sociedad', 'Represento a una empresa.']] as const).map(([v, t, d], i) => (
                <label key={v} className={`flex gap-3 items-start rounded-md border px-3 py-3 cursor-pointer ${personType === v ? 'border-accent-border bg-accent-subtle' : 'border-border-strong bg-surface'}`}>
                  <input id={i === 0 ? 'f-personType' : undefined} type="radio" name="personType" value={v} checked={personType === v}
                    onChange={() => { setPersonType(v); setErrors(e => ({ ...e, personType: undefined })); }} className="mt-1" />
                  <span><span className="block text-body-sm font-medium text-text">{t}</span><span className="block text-caption text-text-muted">{d}</span></span>
                </label>
              ))}
            </div>
            {errors.personType && <p id="f-personType-msg" className="mt-1 text-caption text-danger-text">{errors.personType}</p>}
          </fieldset>
        )}

        {personType && (
          <>
            {company.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-h4 text-text-heading">Datos de la sociedad</h2>
                {company.map(field)}
              </section>
            )}
            <section className="space-y-4">
              {company.length > 0 && <h2 className="text-h4 text-text-heading">Datos de quien firma</h2>}
              {personal.map(field)}
            </section>

            <div className="rounded-md border border-border bg-surface-muted px-4 py-3 space-y-2">
              <p className="flex items-center gap-2 text-small font-medium text-text"><ShieldCheck size={16} className="text-accent-text" aria-hidden />Privacidad</p>
              <p className="text-caption text-text-muted">
                {open.ownerName} es el responsable del tratamiento de tus datos. Avocat los trata por su cuenta, como encargado,
                solo para preparar {docs}. Más información en la <Link href="/privacidad" className="underline text-accent-text">política de privacidad</Link>.
              </p>
              <label className="flex gap-2 items-start text-caption text-text">
                <input id="f-consent" type="checkbox" checked={consent} className="mt-0.5"
                  onChange={e => { setConsent(e.target.checked); setErrors(er => ({ ...er, consent: undefined })); }}
                  aria-describedby={errors.consent ? 'f-consent-msg' : undefined} />
                <span>He leído el aviso de privacidad y acepto que mis datos se usen para preparar estos documentos.<span className="text-danger-text" aria-hidden> *</span></span>
              </label>
              {errors.consent && <p id="f-consent-msg" className="text-caption text-danger-text">{errors.consent}</p>}
            </div>

            {submitError && <Alert tone="danger">{submitError}</Alert>}
            <Button type="submit" variant="primary" size="lg" block loading={sending} loadingText="Enviando…">Enviar mis datos</Button>
            <p className="text-caption text-text-muted text-center">* Obligatorio</p>
          </>
        )}
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">{children}</div>
    </div>
  );
}
