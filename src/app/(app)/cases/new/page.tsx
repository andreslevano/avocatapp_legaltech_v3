'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { createCase, type CaseType } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: 'civil',        label: 'Civil' },
  { value: 'laboral',      label: 'Laboral' },
  { value: 'contractual',  label: 'Contractual' },
  { value: 'familia',      label: 'Familia' },
  { value: 'penal',        label: 'Penal' },
  { value: 'sucesoral',    label: 'Sucesoral' },
  { value: 'otro',         label: 'Otro' },
];

function generateRef(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `AVC-${year}-${num}`;
}

export default function NewCasePage() {
  const { userDoc } = useAppAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    type: 'civil' as CaseType,
    client: '',
    ref: generateRef(),
    deadline: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('El título es obligatorio.');
    setError('');
    setSaving(true);
    try {
      const id = await createCase(userDoc.uid, {
        title:  form.title.trim(),
        type:   form.type,
        status: 'active',
        ref:    form.ref || generateRef(),
        client: form.client.trim(),
        notes:  form.notes.trim(),
        deadline: null,
      });
      router.push(`/cases/${id}`);
    } catch {
      setError('Error al crear el caso. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Nuevo caso"
        actions={
          <Link href="/cases">
            <Button variant="BtnGhost" size="sm">← Cancelar</Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Título *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Despido improcedente García López"
                value={form.title}
                onChange={set('title')}
                className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Tipo de caso *
                </label>
                <select
                  value={form.type}
                  onChange={set('type')}
                  className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 transition-colors"
                >
                  {CASE_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-[#1e1c16]">{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Referencia
                </label>
                <input
                  type="text"
                  value={form.ref}
                  onChange={set('ref')}
                  placeholder="AVC-2025-001"
                  className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Cliente
                </label>
                <input
                  type="text"
                  value={form.client}
                  onChange={set('client')}
                  placeholder="Nombre del cliente"
                  className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={set('deadline')}
                  className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Notas iniciales
              </label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Descripción, antecedentes, observaciones..."
                className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/cases" className="flex-1">
                <Button type="button" variant="BtnOutlineDark" size="lg" fullWidth>Cancelar</Button>
              </Link>
              <Button type="submit" variant="BtnGold" size="lg" fullWidth loading={saving}>
                Crear caso
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
