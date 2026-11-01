'use client';

// "Firmar y enviar" review sheet (Phase 2). The owner signs first inside Avocat (embedded,
// routing 1); DocuSign emails the counterparty (routing 2) only after that.

import { useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { docusignInfo, startDocusignConnect } from '@/lib/docusign/client';
import { createSignatureRequest, getSigningUrl, saveSignResume, SignatureClientError } from '@/lib/signatures/client';
import { DEFAULT_SIGNATURE_OPTIONS, EMAIL_RE, type SignatureOptions } from '@/lib/signatures/types';

export interface SignAndSendSheetProps {
  documentId: string;
  markdown: string;
  title: string;
  defaultCounterparty: { name: string; email: string };
  language: 'es' | 'en';
  returnTo: string;               // page to come back to after connecting DocuSign
  onClose: () => void;
}

const FIELD = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const LABEL = 'block text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1';

function defaultSubject(title: string, lang: 'es' | 'en') {
  return (lang === 'en' ? `Signature requested: ${title}` : `Firma solicitada: ${title}`).slice(0, 100);
}

function defaultMessage(title: string, counterparty: string, owner: string, lang: 'es' | 'en') {
  const hi = counterparty.trim() ? counterparty.trim().split(/\s+/)[0] : '';
  return lang === 'en'
    ? `Hello${hi ? ` ${hi}` : ''},\n\nPlease review and sign "${title}". I have already signed it.\n\nThank you,\n${owner}`
    : `Hola${hi ? ` ${hi}` : ''},\n\nTe envío "${title}" para tu firma. Yo ya lo he firmado.\n\nGracias,\n${owner}`;
}

export default function SignAndSendSheet(p: SignAndSendSheetProps) {
  const { user, userDoc } = useAppAuth();
  const info = docusignInfo(userDoc);
  const connected = !!info && info.status !== 'reauth_required';
  const ownerName = info?.name || info?.email || '';

  const [name, setName] = useState(p.defaultCounterparty.name);
  const [email, setEmail] = useState(p.defaultCounterparty.email);
  const [subject, setSubject] = useState(defaultSubject(p.title, p.language));
  const [message, setMessage] = useState(defaultMessage(p.title, p.defaultCounterparty.name, ownerName, p.language));
  const [advanced, setAdvanced] = useState(false);
  const [options, setOptions] = useState<SignatureOptions>({ ...DEFAULT_SIGNATURE_OPTIONS, language: p.language });
  const [busy, setBusy] = useState<'' | 'send' | 'connect' | 'resume'>('');
  const [error, setError] = useState('');
  const [resumeId, setResumeId] = useState<string | null>(null);

  const setOpt = (k: keyof SignatureOptions, v: number | string) => setOptions(o => ({ ...o, [k]: v }));

  const connect = async () => {
    setBusy('connect'); setError('');
    saveSignResume({ documentId: p.documentId, markdown: p.markdown, title: p.title, counterparty: { name, email } });
    try { await startDocusignConnect(user, { returnTo: p.returnTo }); }
    catch (e) { setError((e as Error).message); setBusy(''); }
  };

  const send = async () => {
    setError('');
    if (!name.trim()) return setError('Indica el nombre de la otra parte.');
    if (!EMAIL_RE.test(email.trim())) return setError('El email de la otra parte no es válido.');
    if (info?.email && email.trim().toLowerCase() === info.email.toLowerCase()) {
      return setError('El email de la otra parte es el tuyo. Indica el email de quien debe firmar.');
    }
    setBusy('send');
    try {
      const { signingUrl } = await createSignatureRequest(user, {
        documentId: p.documentId, markdown: p.markdown, title: p.title,
        counterparty: { name: name.trim(), email: email.trim() },
        subject: subject.trim(), message, options,
      });
      window.location.assign(signingUrl);           // embedded signing (D6: full-page redirect)
    } catch (e) {
      const err = e as SignatureClientError;
      if (err.code === 'already_in_signature' && err.requestId) setResumeId(err.requestId);
      if (err.code === 'reconnect_required') {
        setError('La conexión con DocuSign ha caducado. Reconéctala para continuar.');
      } else {
        setError(err.message || 'No pudimos enviar el documento a firmar.');
      }
      setBusy('');
    }
  };

  const resume = async () => {
    if (!resumeId) return;
    setBusy('resume'); setError('');
    try { window.location.assign((await getSigningUrl(user, resumeId)).signingUrl); }
    catch (e) { setError((e as Error).message); setBusy(''); }
  };

  return (
    <ModalShell title="Firmar y enviar con DocuSign" onClose={busy ? () => {} : p.onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-4 text-[12px] font-sans">
        <p className="text-[#6b6050] truncate">{p.title}</p>

        {!connected ? (
          <div className="rounded-lg border border-avocat-gold/20 bg-avocat-gold/5 px-3 py-3 space-y-2">
            <p className="text-[12px] text-[#c8c0ac]">
              {info ? 'La conexión con DocuSign ha caducado.' : 'Conecta tu cuenta de DocuSign para enviar documentos a firmar.'}
              {' '}Volverás aquí con el documento listo para enviar.
            </p>
            <Button variant="BtnGold" size="sm" loading={busy === 'connect'} onClick={connect}>
              {info ? 'Reconectar DocuSign' : 'Conectar DocuSign'}
            </Button>
          </div>
        ) : (
          <>
            <section className="space-y-1">
              <p className={LABEL}>1 · Firmas tú, ahora</p>
              <p className="text-[#c8c0ac]">{info?.name} <span className="text-[#6b6050]">· {info?.email}</span></p>
              <p className="text-[11px] text-[#6b6050]">Firmarás en el primer bloque de firma, sin salir del flujo de Avocat.</p>
            </section>

            <section className="space-y-2">
              <p className={LABEL}>2 · Después firma</p>
              <input className={FIELD} placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} />
              <input className={FIELD} type="email" placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
              <p className="text-[11px] text-[#6b6050]">Recibirá un email de DocuSign cuando hayas firmado. No necesita cuenta.</p>
            </section>

            <section className="space-y-2">
              <div>
                <label className={LABEL}>Asunto del email</label>
                <input className={FIELD} maxLength={100} value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Mensaje</label>
                <textarea className={`${FIELD} resize-none leading-relaxed`} rows={5} maxLength={2000}
                  value={message} onChange={e => setMessage(e.target.value)} />
              </div>
            </section>

            <section>
              <button type="button" onClick={() => setAdvanced(a => !a)}
                className="text-[11px] text-avocat-gold/70 hover:text-avocat-gold">
                {advanced ? '▾' : '▸'} Opciones avanzadas
              </button>
              {advanced ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className={LABEL}>Primer recordatorio (días)</span>
                    <input className={FIELD} type="number" min={1} max={30} value={options.reminderDelayDays}
                      onChange={e => setOpt('reminderDelayDays', Number(e.target.value) || 1)} />
                  </label>
                  <label className="space-y-1">
                    <span className={LABEL}>Repetir cada (días)</span>
                    <input className={FIELD} type="number" min={1} max={30} value={options.reminderFrequencyDays}
                      onChange={e => setOpt('reminderFrequencyDays', Number(e.target.value) || 1)} />
                  </label>
                  <label className="space-y-1">
                    <span className={LABEL}>Caduca a los (días)</span>
                    <input className={FIELD} type="number" min={1} max={120} value={options.expireAfterDays}
                      onChange={e => setOpt('expireAfterDays', Number(e.target.value) || 30)} />
                  </label>
                  <label className="space-y-1">
                    <span className={LABEL}>Idioma del email</span>
                    <select className={FIELD} value={options.language} onChange={e => setOpt('language', e.target.value)}>
                      <option value="es" className="bg-[#161410]">Español</option>
                      <option value="en" className="bg-[#161410]">English</option>
                    </select>
                  </label>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-[#6b6050]">
                  Recordatorio cada {options.reminderFrequencyDays} días a partir del día {options.reminderDelayDays} · caduca en {options.expireAfterDays} días
                </p>
              )}
            </section>

            <p className="rounded-lg bg-[#161410] border border-[#2e2b20] px-3 py-2 text-[11px] text-[#9a9a9a]">
              🔒 Mientras esté en firma, el documento queda bloqueado. Para cambiarlo habrá que anular el envío y crear una nueva versión.
            </p>
          </>
        )}

        {error && <p className="text-[12px] text-red-400">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="BtnGhost" size="sm" className="!text-[#9a9a9a] hover:!bg-transparent hover:!text-[#c8c0ac]"
          disabled={!!busy} onClick={p.onClose}>Cancelar</Button>
        {resumeId ? (
          <Button variant="BtnGold" size="sm" loading={busy === 'resume'} onClick={resume}>Continuar firma</Button>
        ) : connected ? (
          <Button variant="BtnGold" size="sm" loading={busy === 'send'} onClick={send}>Firmar y enviar →</Button>
        ) : null}
      </div>
    </ModalShell>
  );
}
