'use client';

// "Firmar y enviar" review sheet (Phase 2, 5b). The owner signs first inside Avocat (embedded,
// routing 1); DocuSign emails the other signers only after that — one after another or all at
// once — and copies the CC recipients.

import { useEffect, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { docusignInfo, startDocusignConnect } from '@/lib/docusign/client';
import { createSignatureRequest, getSignatureProvider, getSigningUrl, openOwnerSigning, saveSignResume, SignatureClientError, type SignatureProviderInfo } from '@/lib/signatures/client';
import { DEFAULT_SIGNATURE_OPTIONS, EMAIL_RE, type SignatureOptions } from '@/lib/signatures/types';
import { ACCESS_CODE_RE, MAX_CC, MAX_SIGNERS, type SigningOrder } from '@/lib/signatures/recipients';
import { FileSignature, Lock, PenLine } from 'lucide-react';
import ManualSignPanel from './ManualSignPanel';

export interface SignAndSendSheetProps {
  documentId: string;
  markdown?: string;              // omitted → the server signs the saved .doc
  title: string;
  defaultCounterparty: { name: string; email: string };
  /** 5b: several signers / CC prefilled (e.g. back from connecting DocuSign). */
  defaultSigners?: { name: string; email: string }[];
  defaultCc?: { name: string; email: string }[];
  language: 'es' | 'en';
  returnTo: string;               // page to come back to after connecting DocuSign
  onClose: () => void;
  /** Skip the "¿Cómo quieres firmar?" step (e.g. back from connecting DocuSign → digital). */
  initialMethod?: 'digital' | 'manual';
}

type Method = 'digital' | 'manual';

/**
 * "Firmar y enviar": first the owner chooses how to sign — digital (DocuSign, as before) or with the
 * handwritten signature saved in Perfil (Firma manuscrita: stamped and emailed for the others to sign
 * by hand).
 */
export default function SignAndSendSheet(p: SignAndSendSheetProps) {
  const [method, setMethod] = useState<Method | null>(p.initialMethod ?? null);
  const { user, userDoc } = useAppAuth();
  const info = docusignInfo(userDoc);
  const hasHandwritten = !!(userDoc as unknown as Record<string, unknown>).signatureUrl;
  // Which providers this account can use for new requests (Yousign default; DocuSign if enabled).
  const [prov, setProv] = useState<SignatureProviderInfo | null>(null);
  const [chosen, setChosen] = useState<Provider | null>(null);
  useEffect(() => {
    getSignatureProvider(user)
      .then(setProv)
      .catch(() => setProv({ provider: 'docusign', docusignAvailable: true, yousignAvailable: false }));
  }, [user]);
  const options = prov ? providerOptions(prov) : [];

  // The provider for "Firma digital": the user's pick; back from connecting DocuSign (initialMethod
  // 'digital') → DocuSign; else their last choice on this device, else the default.
  const provider: Provider | null = !prov ? null
    : chosen ?? (p.initialMethod === 'digital' && options.includes('docusign') ? 'docusign'
      : (() => { const last = readLastProvider(); return last && options.includes(last) ? last : prov.provider; })());

  if (method === 'digital') {
    if (!provider) return <ModalShell title="Firmar y enviar" onClose={p.onClose} sheetOnMobile><p className="text-caption text-text-muted py-6 text-center">Preparando…</p></ModalShell>;
    return <DigitalSignSheet {...p} provider={provider} onBack={() => { setMethod(null); setChosen(null); }} />;
  }
  if (method === 'manual') {
    return (
      <ModalShell title="Firmar y enviar con tu firma manuscrita" onClose={p.onClose} sheetOnMobile>
        <div className="overflow-y-auto -mx-1 px-1">
          <p className="text-caption text-text-muted truncate mb-3">{p.title}</p>
          <ManualSignPanel
            documentId={p.documentId} title={p.title} language={p.language}
            defaultRecipients={p.defaultSigners?.length ? p.defaultSigners : [p.defaultCounterparty].filter(x => x.name || x.email)}
            defaultCc={p.defaultCc}
            onClose={p.onClose} onBack={() => setMethod(null)}
          />
        </div>
      </ModalShell>
    );
  }

  const option = (onClick: () => void, Icon: typeof PenLine, title: string, desc: string, note: string, badge?: string) => (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-xl border border-border-strong bg-surface hover:border-accent-border hover:bg-accent-subtle px-4 py-3 transition-colors min-h-touch">
      <span className="flex items-center gap-2 text-small font-semibold text-text-heading">
        <Icon size={18} aria-hidden className="text-accent-text" />{title}
        {badge && <span className="ml-auto px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-caption font-medium text-accent-text">{badge}</span>}
      </span>
      <span className="block mt-1 text-caption text-text">{desc}</span>
      {note && <span className="block mt-1 text-caption text-text-muted">{note}</span>}
    </button>
  );
  const pick = (pr: Provider) => () => { setChosen(pr); saveLastProvider(pr); setMethod('digital'); };
  const yousignCard = (both: boolean) => option(pick('yousign'), FileSignature, both ? 'Firma digital con Yousign' : 'Firma digital',
    'Firmas aquí y cada parte recibe un email de Avocat para firmar online, sin cuenta. El PDF firmado y los registros de auditoría vuelven solos a Documentos.',
    'Firma electrónica simple (SES) conforme al Reglamento eIDAS. No necesitas ninguna cuenta.', both ? 'Recomendada' : undefined);
  const docusignCard = (both: boolean) => option(pick('docusign'), FileSignature, both ? 'Firma digital con DocuSign' : 'Firma digital',
    'Con tu cuenta de DocuSign: firmas aquí y cada parte firma electrónicamente por email. El PDF firmado y el certificado vuelven solos a Documentos.',
    info && info.status !== 'reauth_required' ? `Cuenta conectada: ${info.email ?? ''}` : 'Necesitas conectar tu cuenta de DocuSign (te lo pedimos en el siguiente paso).');

  return (
    <ModalShell title="Firmar y enviar" onClose={p.onClose} sheetOnMobile>
      <div className="space-y-3">
        <p className="text-caption text-text-muted truncate">{p.title}</p>
        <p className="text-small text-text">¿Cómo quieres firmar?</p>
        {!prov ? (
          <p className="text-caption text-text-muted py-2">Preparando…</p>
        ) : (
          options.map(o => <div key={o}>{o === 'yousign' ? yousignCard(options.length > 1) : docusignCard(options.length > 1)}</div>)
        )}
        {option(() => setMethod('manual'), PenLine, 'Firma manuscrita',
          'Con la firma que dibujaste en tu perfil: la colocamos en el documento y lo enviamos por email para que los demás firmen a mano.',
          hasHandwritten ? '' : 'Aún no tienes firma guardada: te llevaremos a dibujarla.')}
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={p.onClose}>Cancelar</Button>
        </div>
      </div>
    </ModalShell>
  );
}

type Provider = 'yousign' | 'docusign';

/** Digital providers offered, the default first (Yousign when configured; DocuSign when enabled). */
export function providerOptions(i: SignatureProviderInfo): Provider[] {
  const other: Provider = i.provider === 'yousign' ? 'docusign' : 'yousign';
  const otherOn = other === 'yousign' ? !!i.yousignAvailable : i.docusignAvailable;
  return otherOn ? [i.provider, other] : [i.provider];
}

const LAST_KEY = 'avocat.signProvider';
function readLastProvider(): Provider | null {
  try { const v = localStorage.getItem(LAST_KEY); return v === 'yousign' || v === 'docusign' ? v : null; } catch { return null; }
}
function saveLastProvider(v: Provider) {
  try { localStorage.setItem(LAST_KEY, v); } catch { /* private mode */ }
}

interface SignerRow { key: number; name: string; email: string; code: string; useCode: boolean }
interface CcRow { key: number; name: string; email: string }
let keySeq = 0;
const nextKey = () => ++keySeq;

const FIELD = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border';
const LABEL = 'block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1';

function defaultSubject(title: string, lang: 'es' | 'en') {
  return (lang === 'en' ? `Signature requested: ${title}` : `Firma solicitada: ${title}`).slice(0, 100);
}

function defaultMessage(title: string, counterparty: string, owner: string, lang: 'es' | 'en') {
  const hi = counterparty.trim() ? counterparty.trim().split(/\s+/)[0] : '';
  return lang === 'en'
    ? `Hello${hi ? ` ${hi}` : ''},\n\nPlease review and sign "${title}". I have already signed it.\n\nThank you,\n${owner}`
    : `Hola${hi ? ` ${hi}` : ''},\n\nTe envío "${title}" para tu firma. Yo ya lo he firmado.\n\nGracias,\n${owner}`;
}

function DigitalSignSheet(p: SignAndSendSheetProps & { onBack: () => void; provider: 'yousign' | 'docusign' }) {
  const { user, userDoc } = useAppAuth();
  const ys = p.provider === 'yousign';
  const info = docusignInfo(userDoc);
  // Yousign: one Avocat account — nothing to connect; the owner is the Avocat user.
  const connected = ys || (!!info && info.status !== 'reauth_required');
  const ownerName = ys ? (userDoc.displayName || user.email || '') : info?.name || info?.email || '';
  const ownerEmail = ys ? user.email ?? '' : info?.email ?? '';

  const [signers, setSigners] = useState<SignerRow[]>(() =>
    (p.defaultSigners?.length ? p.defaultSigners : [p.defaultCounterparty]).map(x => ({ key: nextKey(), name: x.name, email: x.email, code: '', useCode: false })));
  const [cc, setCc] = useState<CcRow[]>(() => (p.defaultCc ?? []).map(x => ({ key: nextKey(), ...x })));
  const [order, setOrder] = useState<SigningOrder>('sequential');
  const [subject, setSubject] = useState(defaultSubject(p.title, p.language));
  const [message, setMessage] = useState(defaultMessage(p.title, p.defaultCounterparty.name, ownerName, p.language));
  const [advanced, setAdvanced] = useState(false);
  const [options, setOptions] = useState<SignatureOptions>({ ...DEFAULT_SIGNATURE_OPTIONS, language: p.language });
  const [busy, setBusy] = useState<'' | 'send' | 'connect' | 'resume'>('');
  const [error, setError] = useState('');
  const [resumeId, setResumeId] = useState<string | null>(null);

  const setOpt = (k: keyof SignatureOptions, v: number | string) => setOptions(o => ({ ...o, [k]: v }));

  const setSigner = (key: number, patch: Partial<SignerRow>) => setSigners(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  const setCcRow = (key: number, patch: Partial<CcRow>) => setCc(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  const parties = (rows: { name: string; email: string }[]) => rows.map(r => ({ name: r.name.trim(), email: r.email.trim() }));

  const connect = async () => {
    setBusy('connect'); setError('');
    saveSignResume({
      documentId: p.documentId, markdown: p.markdown, title: p.title,
      counterparty: parties(signers)[0], signers: parties(signers), cc: parties(cc),
    });
    try { await startDocusignConnect(user, { returnTo: p.returnTo }); }
    catch (e) { setError((e as Error).message); setBusy(''); }
  };

  const invalid = (): string => {
    for (const r of signers) {
      if (!r.name.trim()) return 'Indica el nombre de cada firmante.';
      if (!EMAIL_RE.test(r.email.trim())) return `El email de ${r.name.trim()} no es válido.`;
      if (!ys && r.useCode && !ACCESS_CODE_RE.test(r.code)) return `El código de acceso de ${r.name.trim()} debe tener entre 4 y 20 letras o números.`;
    }
    for (const r of cc) if (!EMAIL_RE.test(r.email.trim())) return 'Revisa los emails en copia.';
    const emails = [...signers, ...cc].map(r => r.email.trim().toLowerCase());
    if (ownerEmail && emails.includes(ownerEmail.toLowerCase())) {
      return 'Tú ya firmas el primero: no te añadas como firmante ni en copia.';
    }
    if (new Set(emails).size !== emails.length) return 'Cada persona debe tener un email distinto.';
    return '';
  };

  const send = async () => {
    setError('');
    const msg = invalid();
    if (msg) return setError(msg);
    setBusy('send');
    try {
      const target = await createSignatureRequest(user, {
        documentId: p.documentId, markdown: p.markdown, title: p.title,
        signers: signers.map(r => ({ name: r.name.trim(), email: r.email.trim(), ...(r.useCode ? (ys ? { otp: true } : { accessCode: r.code }) : {}) })),
        provider: p.provider,
        cc: cc.map(r => ({ name: r.name.trim(), email: r.email.trim() })),
        signingOrder: order,
        subject: subject.trim(), message, options,
      });
      openOwnerSigning(target.requestId, target, p.title);   // Yousign modal, Focused View (desktop) or redirect
      if (target.focused || target.yousign) p.onClose();
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
    try {
      const target = await getSigningUrl(user, resumeId);
      openOwnerSigning(resumeId, target, p.title);
      if (target.focused || target.yousign) p.onClose();
    }
    catch (e) { setError((e as Error).message); setBusy(''); }
  };

  return (
    <ModalShell title={ys ? 'Firmar y enviar' : 'Firmar y enviar con DocuSign'} onClose={busy ? () => {} : p.onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-4 text-caption font-sans">
        <p className="text-text-muted truncate">{p.title}</p>

        {!connected ? (
          <div className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-3 space-y-2">
            <p className="text-caption text-text">
              {info ? 'La conexión con DocuSign ha caducado.' : 'Conecta tu cuenta de DocuSign para enviar documentos a firmar.'}
              {' '}Volverás aquí con el documento listo para enviar.
            </p>
            <Button variant="accent" size="sm" loading={busy === 'connect'} onClick={connect}>
              {info ? 'Reconectar DocuSign' : 'Conectar DocuSign'}
            </Button>
          </div>
        ) : (
          <>
            <section className="space-y-1">
              <p className={LABEL}>1 · Firmas tú, ahora</p>
              <p className="text-text">{ownerName} <span className="text-text-muted">· {ownerEmail}</span></p>
              <p className="text-caption text-text-muted">Firmarás en el primer bloque de firma, sin salir del flujo de Avocat.</p>
            </section>

            <section className="space-y-2">
              <p className={LABEL}>2 · Después {signers.length > 1 ? 'firman' : 'firma'}</p>
              {signers.map((r, i) => (
                <div key={r.key} className="space-y-1.5 rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2">
                    {signers.length > 1 && <span className="text-caption text-text-muted w-4 flex-shrink-0">{order === 'sequential' ? `${i + 2}.` : '·'}</span>}
                    <input className={FIELD} placeholder="Nombre completo" value={r.name} onChange={e => setSigner(r.key, { name: e.target.value })} />
                    {signers.length > 1 && (
                      <button type="button" aria-label="Quitar firmante" onClick={() => setSigners(rs => rs.filter(x => x.key !== r.key))}
                        className="text-text-muted hover:text-danger-text text-body leading-none px-1">×</button>
                    )}
                  </div>
                  <input className={FIELD} type="email" placeholder="email@empresa.com" value={r.email} onChange={e => setSigner(r.key, { email: e.target.value })} />
                  {ys ? (
                    <label className="flex items-start gap-2 text-caption text-text cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={r.useCode} onChange={e => setSigner(r.key, { useCode: e.target.checked })} />
                      <span><Lock size={12} aria-hidden className="inline -mt-0.5" /> Pedir código por email <span className="text-text-muted">— Yousign le enviará un código para abrir el documento.</span></span>
                    </label>
                  ) : r.useCode ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input className={FIELD} placeholder="Código de acceso (4–20 letras o números)" value={r.code} maxLength={20}
                          autoComplete="off" onChange={e => setSigner(r.key, { code: e.target.value.replace(/\s/g, '') })} />
                        <button type="button" onClick={() => setSigner(r.key, { useCode: false, code: '' })}
                          className="text-caption text-text-muted hover:text-text whitespace-nowrap">Quitar</button>
                      </div>
                      <p className="text-caption text-text-muted">DocuSign se lo pedirá antes de abrir el documento. Compártelo por otro canal (teléfono, WhatsApp); Avocat no lo guarda.</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setSigner(r.key, { useCode: true })}
                      className="text-caption text-accent-text hover:text-accent-text inline-flex items-center gap-1"><Lock size={12} aria-hidden /> Pedir código de acceso</button>
                  )}
                </div>
              ))}
              {signers.length < MAX_SIGNERS && (
                <button type="button" onClick={() => setSigners(rs => [...rs, { key: nextKey(), name: '', email: '', code: '', useCode: false }])}
                  className="text-caption text-accent-text hover:text-accent-text">+ Añadir firmante</button>
              )}
              {signers.length > 1 && (
                <div className="space-y-1">
                  <div className="inline-flex rounded-lg border border-border overflow-hidden text-caption">
                    {(['sequential', 'parallel'] as const).map(o => (
                      <button key={o} type="button" onClick={() => setOrder(o)}
                        className={`px-3 py-1.5 ${order === o ? 'bg-accent-subtle text-accent-text' : 'text-text-muted hover:text-text'}`}>
                        {o === 'sequential' ? 'En orden' : 'A la vez'}
                      </button>
                    ))}
                  </div>
                  <p className="text-caption text-text-muted">
                    {order === 'sequential'
                      ? 'Cada firmante recibe el email cuando firma el anterior, en el orden de la lista.'
                      : 'Todos reciben el email a la vez, en cuanto firmes tú.'}
                  </p>
                </div>
              )}
              <p className="text-caption text-text-muted">
                {ys
                  ? (signers.length === 1 ? 'Recibirá un email de Avocat con su enlace de firma cuando hayas firmado. No necesita cuenta.' : 'Recibirán un email de Avocat con su enlace de firma. No necesitan cuenta.')
                  : signers.length === 1 ? 'Recibirá un email de DocuSign cuando hayas firmado. No necesita cuenta.' : 'No necesitan cuenta de DocuSign.'}
                {' '}Si el documento no tiene un bloque «Firma:» para cada persona, lo añadimos al final.
              </p>
            </section>

            <section className="space-y-2">
              <p className={LABEL}>En copia <span className="normal-case tracking-normal font-normal">(opcional — reciben el documento firmado)</span></p>
              {cc.map(r => (
                <div key={r.key} className="flex items-center gap-2">
                  <input className={FIELD} placeholder="Nombre" value={r.name} onChange={e => setCcRow(r.key, { name: e.target.value })} />
                  <input className={FIELD} type="email" placeholder="email@empresa.com" value={r.email} onChange={e => setCcRow(r.key, { email: e.target.value })} />
                  <button type="button" aria-label="Quitar copia" onClick={() => setCc(rs => rs.filter(x => x.key !== r.key))}
                    className="text-text-muted hover:text-danger-text text-body leading-none px-1">×</button>
                </div>
              ))}
              {cc.length < MAX_CC && (
                <button type="button" onClick={() => setCc(rs => [...rs, { key: nextKey(), name: '', email: '' }])}
                  className="text-caption text-accent-text hover:text-accent-text">+ Añadir en copia</button>
              )}
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
                className="text-caption text-accent-text hover:text-accent-text">
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
                      <option value="es" className="bg-bg">Español</option>
                      <option value="en" className="bg-bg">English</option>
                    </select>
                  </label>
                </div>
              ) : (
                <p className="mt-1 text-caption text-text-muted">
                  Recordatorio cada {options.reminderFrequencyDays} días a partir del día {options.reminderDelayDays} · caduca en {options.expireAfterDays} días
                  {ys && ' · Firma electrónica simple (SES) conforme al Reglamento eIDAS, con Yousign'}
                </p>
              )}
            </section>

            <p className="rounded-lg bg-bg border border-border px-3 py-2 text-caption text-text-muted">
              <Lock size={12} className="inline -mt-0.5" aria-hidden /> Mientras esté en firma, el documento queda bloqueado. Para cambiarlo habrá que anular el envío y crear una nueva versión.
            </p>
          </>
        )}

        {error && <p className="text-caption text-danger-text">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" className="!text-text-muted hover:!bg-transparent hover:!text-text"
          disabled={!!busy} onClick={p.onBack}>Volver</Button>
        {resumeId ? (
          <Button variant="accent" size="sm" loading={busy === 'resume'} onClick={resume}>Continuar firma</Button>
        ) : connected ? (
          <Button variant="accent" size="sm" loading={busy === 'send'} onClick={send}>Firmar y enviar →</Button>
        ) : null}
      </div>
    </ModalShell>
  );
}
