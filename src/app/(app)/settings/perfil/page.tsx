'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import ConnectDocusignCard from '@/components/integrations/ConnectDocusignCard';
import ConnectMicrosoftCard from '@/components/integrations/ConnectMicrosoftCard';
import { canUseMicrosoft } from '@/lib/integrations/microsoft/config';
import { canUseDocusign } from '@/lib/docusign/config';
import NotificationSettingsCard from '@/components/notifications/NotificationSettingsCard';
import BrandingCard from '@/components/settings/BrandingCard';
import { canUseContracts } from '@/lib/contracts/config';
import { primitives } from '@/lib/tokens';

const COUNTRIES = [
  { label: 'España',    code: 'ES' },
  { label: 'Colombia',  code: 'CO' },
  { label: 'México',    code: 'MX' },
  { label: 'Chile',     code: 'CL' },
  { label: 'Perú',      code: 'PE' },
  { label: 'Ecuador',   code: 'EC' },
  { label: 'Argentina', code: 'AR' },
];

const SPECIALTIES = [
  'Derecho Civil',
  'Derecho Penal',
  'Derecho Laboral',
  'Derecho Mercantil',
  'Derecho de Familia',
  'Derecho Administrativo',
  'Derecho Tributario',
  'Derecho Procesal',
  'Otra',
];

const PLAN_META: Record<string, { label: string; price: string; color: string; bg: string; border: string }> = {
  Abogados: {
    label: 'Plan Abogados',
    price: '€75 / mes',
    color: 'text-accent-text',
    bg: 'bg-accent-subtle',
    border: 'border-accent-border',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    color: 'text-info-text',
    bg: 'bg-info-subtle',
    border: 'border-status-en-revision-border',
  },
  Autoservicio: {
    label: 'Plan Particular',
    price: '€50 / mes',
    color: 'text-success-text',
    bg: 'bg-success-subtle',
    border: 'border-status-a-tiempo-border',
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-small font-sans text-text',
        ' focus:border-accent-border transition-colors placeholder:text-text-muted',
        props.disabled ? 'opacity-50 cursor-not-allowed' : '',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

export default function ProfilePage() {
  const { user, userDoc } = useAppAuth();

  const ud = userDoc as Record<string, unknown>;
  const [form, setForm] = useState({
    displayName:              userDoc.displayName || user.displayName || '',
    phone:                    (ud.phone       as string) || '',
    country:                  (ud.country     as string) || '',
    specialty:                (ud.legalSpecialty as string) || '',
    legalCompanyName:         (ud.legalCompanyName as string) || '',
    legalIdType:              (ud.legalIdType as string) || 'RUT',
    legalIdNumber:            (ud.legalIdNumber as string) || '',
    legalRepresentativeCapacity: (ud.legalRepresentativeCapacity as string) || '',
    legalAddress:             (ud.legalAddress as string) || '',
  });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  // Signature pad
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const isDrawing    = useRef(false);
  const lastPos      = useRef({ x: 0, y: 0 });
  const [hasSig,     setHasSig]     = useState(false);
  const [savingSig,  setSavingSig]  = useState(false);
  const [sigSaved,   setSigSaved]   = useState(false);
  const [signatureUrl, setSignatureUrl] = useState((ud.signatureUrl as string) || '');
  const [showPad,    setShowPad]    = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showPad) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = primitives['neutral-900']; // ink on the white signature pad
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Prevent page scroll on touch
    const block = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', block, { passive: false });
    canvas.addEventListener('touchmove',  block, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', block);
      canvas.removeEventListener('touchmove',  block);
    };
  }, [showPad]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
             y: ((e as React.MouseEvent).clientY - rect.top)  * scaleY };
  }, []);

  const onStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    setHasSig(true);
  }, [getPos]);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    lastPos.current = pos;
  }, [getPos]);

  const onEnd = useCallback(() => { isDrawing.current = false; }, []);

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !hasSig || !storage || !db) return;
    setSavingSig(true);
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvasRef.current!.toBlob(b => b ? res(b) : rej(new Error('empty')), 'image/png')
      );
      const path = `users/${userDoc.uid}/firma/signature.png`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { contentType: 'image/png' });
      const url = await getDownloadURL(sRef);
      await updateDoc(doc(db, 'users', userDoc.uid), { signatureUrl: url, updatedAt: serverTimestamp() });
      setSignatureUrl(url);
      setSigSaved(true);
      setShowPad(false);
      setTimeout(() => setSigSaved(false), 3000);
    } catch {
      // silent — user can retry
    } finally {
      setSavingSig(false);
    }
  };

  const initials = (user.displayName ?? user.email ?? 'U')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const planMeta = userDoc.plan ? PLAN_META[userDoc.plan] : null;

  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const countryObj = COUNTRIES.find(c => c.label.toLowerCase() === form.country.toLowerCase());

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', userDoc.uid), {
        displayName:                 form.displayName,
        phone:                       form.phone,
        country:                     form.country,
        legalSpecialty:              form.specialty,
        legalCompanyName:            form.legalCompanyName,
        legalIdType:                 form.legalIdType,
        legalIdNumber:               form.legalIdNumber,
        legalRepresentativeCapacity: form.legalRepresentativeCapacity,
        legalAddress:                form.legalAddress,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-h2 font-semibold text-text-heading leading-tight mb-1">
            Mi perfil
          </h1>
          <p className="text-small font-sans text-text-muted">
            Información de tu cuenta y configuración personal
          </p>
        </div>

        {/* Avatar + identity card */}
        <div className="bg-surface border border-border rounded-2xl p-5 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-subtle border-2 border-accent-border flex items-center justify-center flex-shrink-0">
            <span className="text-h3 font-display font-semibold text-accent-text leading-none">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-sans font-semibold text-text-heading truncate">
              {form.displayName || 'Usuario'}
            </p>
            <p className="text-caption font-sans text-text-muted truncate">{user.email}</p>
            {memberSince && (
              <p className="text-caption font-sans text-text-muted mt-0.5">
                Miembro desde {memberSince}
              </p>
            )}
          </div>
          {planMeta && (
            <div className={`ml-auto hidden sm:flex flex-col items-end gap-0.5`}>
              <span className={`text-caption font-sans font-semibold ${planMeta.color}`}>
                {planMeta.label}
              </span>
              <span className={`text-caption font-display font-semibold ${planMeta.color}`}>
                {planMeta.price}
              </span>
            </div>
          )}
        </div>

        {/* Plan card (mobile) */}
        {planMeta && (
          <div className={`sm:hidden ${planMeta.bg} border ${planMeta.border} rounded-xl px-4 py-3 mb-4 flex items-center justify-between`}>
            <span className={`text-caption font-sans font-semibold ${planMeta.color}`}>{planMeta.label}</span>
            <span className={`text-caption font-display font-semibold ${planMeta.color}`}>{planMeta.price}</span>
          </div>
        )}

        {/* Form card */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
          <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
            Datos personales
          </p>

          <Field label="Nombre completo">
            <Input
              type="text"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Tu nombre completo"
            />
          </Field>

          <Field label="Correo electrónico">
            <Input
              type="email"
              value={user.email || ''}
              disabled
              placeholder="correo@ejemplo.com"
            />
            <p className="mt-1.5 text-caption font-sans text-text-muted">
              El correo no se puede modificar
            </p>
          </Field>

          <Field label="Teléfono">
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+34 600 000 000"
            />
          </Field>

          <Field label="País de operación">
            <select
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-small font-sans text-text  focus:border-accent-border transition-colors"
            >
              <option value="" className="bg-bg">Seleccionar país…</option>
              {COUNTRIES.map(c => (
                <option key={c.label} value={c.label} className="bg-bg">
                  {c.label}
                </option>
              ))}
            </select>
            {countryObj && (
              <p className="mt-1.5 text-caption font-sans text-text-muted">
                {countryObj.label}
              </p>
            )}
          </Field>

          {userDoc.plan === 'Abogados' && (
            <Field label="Especialidad legal">
              <select
                value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-small font-sans text-text  focus:border-accent-border transition-colors"
              >
                <option value="" className="bg-bg">Seleccionar especialidad…</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s} className="bg-bg">{s}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Legal info for document generation */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-5 mt-4">
          <div>
            <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
              Información legal para documentos
            </p>
            <p className="text-caption font-sans text-text-muted mt-1">
              Estos datos se usarán para pre-completar NDAs y otros documentos generados con IA.
            </p>
          </div>

          <Field label="Empresa / Organización">
            <Input
              type="text"
              value={form.legalCompanyName}
              onChange={e => setForm(f => ({ ...f, legalCompanyName: e.target.value }))}
              placeholder="Nombre de tu empresa u organización"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de identificación">
              <select
                value={form.legalIdType}
                onChange={e => setForm(f => ({ ...f, legalIdType: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-small font-sans text-text  focus:border-accent-border transition-colors"
              >
                {['RUT', 'DNI', 'Pasaporte', 'Cédula', 'CUIT', 'NIF', 'Otro'].map(t => (
                  <option key={t} value={t} className="bg-bg">{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Número de identificación">
              <Input
                type="text"
                value={form.legalIdNumber}
                onChange={e => setForm(f => ({ ...f, legalIdNumber: e.target.value }))}
                placeholder="Ej: 12.345.678-9"
              />
            </Field>
          </div>

          <Field label="Cargo / Calidad en que actúa">
            <Input
              type="text"
              value={form.legalRepresentativeCapacity}
              onChange={e => setForm(f => ({ ...f, legalRepresentativeCapacity: e.target.value }))}
              placeholder="Ej: Gerente General, Representante Legal, Titular"
            />
          </Field>

          <Field label="Dirección completa">
            <Input
              type="text"
              value={form.legalAddress}
              onChange={e => setForm(f => ({ ...f, legalAddress: e.target.value }))}
              placeholder="Calle, número, ciudad, región, país"
            />
          </Field>
        </div>

        {/* Signature pad */}
        <div className="bg-surface border border-border rounded-2xl p-5 mt-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
                Firma manuscrita
              </p>
              <p className="text-caption font-sans text-text-muted mt-1">
                Se incluirá automáticamente en los documentos generados que requieran firma.
              </p>
            </div>
            {sigSaved && (
              <span className="text-caption font-sans text-success-text flex items-center gap-1.5 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guardada
              </span>
            )}
          </div>

          {/* Existing signature preview */}
          {signatureUrl && !showPad && (
            <div className="mb-3">
              <div className="bg-surface rounded-lg p-3 inline-block border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureUrl} alt="Firma guardada" className="h-16 max-w-[280px] object-contain" />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { setShowPad(true); clearPad(); }}
                  className="text-caption font-sans text-accent-text hover:text-accent-text border border-accent-border hover:border-accent-border px-3 py-1.5 rounded-md transition-colors"
                >
                  Cambiar firma
                </button>
              </div>
            </div>
          )}

          {/* Signature canvas */}
          {(!signatureUrl || showPad) && (
            <div>
              <div className="relative rounded-lg overflow-hidden border border-border bg-surface mb-2" style={{ touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={160}
                  className="w-full h-[120px] cursor-crosshair block"
                  onMouseDown={onStart}
                  onMouseMove={onMove}
                  onMouseUp={onEnd}
                  onMouseLeave={onEnd}
                  onTouchStart={onStart}
                  onTouchMove={onMove}
                  onTouchEnd={onEnd}
                />
                {!hasSig && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-caption font-sans text-text-muted select-none">
                      Dibuja tu firma aquí
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearPad}
                  className="text-caption font-sans text-text-muted hover:text-text border border-border hover:border-border-strong px-3 py-1.5 rounded-md transition-colors"
                >
                  Limpiar
                </button>
                {showPad && signatureUrl && (
                  <button
                    onClick={() => { setShowPad(false); clearPad(); }}
                    className="text-caption font-sans text-text-muted hover:text-text border border-border hover:border-border-strong px-3 py-1.5 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={saveSignature}
                  disabled={!hasSig || savingSig}
                  className="text-caption font-sans font-medium text-text bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
                >
                  {savingSig ? 'Guardando…' : 'Guardar firma'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Identidad de marca: logo, colores y tipografía de los documentos */}
        <BrandingCard />

        {/* Integraciones (DocuSign, Microsoft) */}
        {(canUseDocusign(userDoc.plan, user) || canUseMicrosoft(userDoc.plan, user)) && (
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 mt-4">
            <div>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
                Integraciones
              </p>
              <p className="text-caption font-sans text-text-muted mt-1">
                Conecta servicios externos. Avocat guarda las credenciales cifradas y nunca las muestra en el navegador.
              </p>
            </div>
            {canUseDocusign(userDoc.plan, user) && <ConnectDocusignCard />}
            {canUseMicrosoft(userDoc.plan, user) && <ConnectMicrosoftCard />}
          </div>
        )}

        {/* Notificaciones (F3: contract expiry alerts) */}
        {canUseContracts(userDoc.plan, user) && <NotificationSettingsCard />}

        {/* Save area */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-accent text-text-on-accent text-small font-sans font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {saved && (
            <span className="text-caption font-sans text-success-text flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </span>
          )}

          {error && (
            <span className="text-caption font-sans text-danger-text">{error}</span>
          )}
        </div>

      </div>
    </div>
  );
}
