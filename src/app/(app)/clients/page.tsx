'use client';

import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getClients, type ClientDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import type { Timestamp } from 'firebase/firestore';

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface NewClientForm {
  name: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: NewClientForm = { name: '', email: '', phone: '' };

export default function ClientsPage() {
  const { userDoc } = useAppAuth();
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userDoc.uid) return;
    getClients(userDoc.uid)
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    if (!db) return setError('Base de datos no disponible.');
    setError('');
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        userId: userDoc.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        activeCases: 0,
        lastCaseDate: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      const newClient: ClientDoc = {
        id: docRef.id,
        userId: userDoc.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        activeCases: 0,
        lastCaseDate: null as unknown as Timestamp,
        status: 'active',
      };
      setClients(prev => [newClient, ...prev]);
      setForm(EMPTY_FORM);
      setShowModal(false);
    } catch {
      setError('Error al guardar el cliente. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Clientes"
        subtitle={`${clients.length} cliente${clients.length !== 1 ? 's' : ''}`}
        actions={
          <Button variant="BtnGold" size="sm" onClick={() => setShowModal(true)}>
            + Nuevo cliente
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#6b6050] mb-4">No hay clientes registrados aún.</p>
            <Button variant="BtnGold" size="md" onClick={() => setShowModal(true)}>Añadir primer cliente</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-sans">
              <thead>
                <tr className="border-b border-[#2e2b20]">
                  {['Cliente', 'Email', 'Casos activos', 'Último caso', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-widest uppercase text-[#6b6050]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2b20]">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-[#252218] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#c8c0ac]">{c.name}</td>
                    <td className="px-4 py-3 text-[#6b6050]">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-[#c8c0ac]">{c.activeCases}</td>
                    <td className="px-4 py-3 text-[#6b6050]">{formatDate(c.lastCaseDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[#252218] text-[#6b6050] border-[#2e2b20]'}`}>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-6 w-full max-w-md shadow-elevated">
            <h2 className="font-display text-h3 text-[#e8d4a0] mb-5">Nuevo cliente</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              {error && <p className="text-[12px] text-red-400">{error}</p>}
              {[
                { label: 'Nombre *', field: 'name', type: 'text', placeholder: 'Nombre completo' },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'email@dominio.com' },
                { label: 'Teléfono', field: 'phone', type: 'tel', placeholder: '+34 600 000 000' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[field as keyof NewClientForm]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="BtnGhost" size="md" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" variant="BtnGold" size="md" fullWidth loading={saving}>Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
