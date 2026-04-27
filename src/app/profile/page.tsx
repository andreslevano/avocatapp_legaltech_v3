'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';

const COUNTRIES = [
  { label: 'España',    flag: '🇪🇸' },
  { label: 'Colombia',  flag: '🇨🇴' },
  { label: 'México',    flag: '🇲🇽' },
  { label: 'Chile',     flag: '🇨🇱' },
  { label: 'Perú',      flag: '🇵🇪' },
  { label: 'Ecuador',   flag: '🇪🇨' },
  { label: 'Argentina', flag: '🇦🇷' },
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
    color: 'text-avocat-gold',
    bg: 'bg-avocat-gold/10',
    border: 'border-avocat-gold/25',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  Autoservicio: {
    label: 'Plan Particular',
    price: '€50 / mes',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">
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
        'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3.5 py-2.5 text-[13px] font-sans text-[#c8c0ac]',
        'focus:outline-none focus:border-avocat-gold/40 transition-colors placeholder:text-[#3a3630]',
        props.disabled ? 'opacity-50 cursor-not-allowed' : '',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

export default function ProfilePage() {
  const { user, userDoc } = useAppAuth();

  const [form, setForm] = useState({
    displayName: userDoc.displayName || user.displayName || '',
    phone:       userDoc.phone       || '',
    country:     userDoc.country     || '',
    specialty:   (userDoc as Record<string, unknown>).legalSpecialty as string || '',
  });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

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
        displayName:    form.displayName,
        phone:          form.phone,
        country:        form.country,
        legalSpecialty: form.specialty,
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
    <div className="flex-1 overflow-auto bg-[#161410]">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-[28px] font-semibold text-[#e8d4a0] leading-tight mb-1">
            Mi perfil
          </h1>
          <p className="text-[13px] font-sans text-[#6b6050]">
            Información de tu cuenta y configuración personal
          </p>
        </div>

        {/* Avatar + identity card */}
        <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-avocat-gold/20 border-2 border-avocat-gold/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[20px] font-display font-semibold text-avocat-gold leading-none">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-sans font-semibold text-[#e8d4a0] truncate">
              {form.displayName || 'Usuario'}
            </p>
            <p className="text-[12px] font-sans text-[#6b6050] truncate">{user.email}</p>
            {memberSince && (
              <p className="text-[11px] font-sans text-[#3a3630] mt-0.5">
                Miembro desde {memberSince}
              </p>
            )}
          </div>
          {planMeta && (
            <div className={`ml-auto hidden sm:flex flex-col items-end gap-0.5`}>
              <span className={`text-[11px] font-sans font-semibold ${planMeta.color}`}>
                {planMeta.label}
              </span>
              <span className={`text-[11px] font-display font-semibold ${planMeta.color}`}>
                {planMeta.price}
              </span>
            </div>
          )}
        </div>

        {/* Plan card (mobile) */}
        {planMeta && (
          <div className={`sm:hidden ${planMeta.bg} border ${planMeta.border} rounded-xl px-4 py-3 mb-4 flex items-center justify-between`}>
            <span className={`text-[12px] font-sans font-semibold ${planMeta.color}`}>{planMeta.label}</span>
            <span className={`text-[12px] font-display font-semibold ${planMeta.color}`}>{planMeta.price}</span>
          </div>
        )}

        {/* Form card */}
        <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 space-y-5">
          <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">
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
            <p className="mt-1.5 text-[11px] font-sans text-[#3a3630]">
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
              className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3.5 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 transition-colors"
            >
              <option value="" className="bg-[#161410]">Seleccionar país…</option>
              {COUNTRIES.map(c => (
                <option key={c.label} value={c.label} className="bg-[#161410]">
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
            {countryObj && (
              <p className="mt-1.5 text-[12px] font-sans text-[#6b6050]">
                {countryObj.flag} {countryObj.label}
              </p>
            )}
          </Field>

          {userDoc.plan === 'Abogados' && (
            <Field label="Especialidad legal">
              <select
                value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3.5 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 transition-colors"
              >
                <option value="" className="bg-[#161410]">Seleccionar especialidad…</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s} className="bg-[#161410]">{s}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Save area */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-avocat-gold text-white text-[13px] font-sans font-medium hover:bg-[#a07824] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {saved && (
            <span className="text-[12px] font-sans text-emerald-400 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </span>
          )}

          {error && (
            <span className="text-[12px] font-sans text-red-400">{error}</span>
          )}
        </div>

      </div>
    </div>
  );
}
