'use client';

import { useEffect, useState } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getClients, getCases, type ClientDoc, type CaseDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import type { Timestamp } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { availableDocs, type DocId } from '@/lib/data-requests/catalog';
import { isValidEmail } from '@/lib/data-requests/core';
import {
  createRequest, DocPicker, PrepareLinks, requestStatus, RequestStatusChip, resendRequest, revokeRequest, SentNotice,
  type SentResult,
} from '@/components/clients/DataRequestControls';

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface NewClientForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  idType: string;
  idNumber: string;
  representativeCapacity: string;
  address: string;
}

const EMPTY_FORM: NewClientForm = {
  name: '', email: '', phone: '',
  company: '', idType: 'RUT', idNumber: '',
  representativeCapacity: '', address: '',
};

export default function ClientsPage() {
  const { user, userDoc } = useAppAuth();
  const requestableDocs = availableDocs(user);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [cases,   setCases]   = useState<CaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);
  const [form, setForm] = useState<NewClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // "Solicitar datos al cliente"
  const [requestOn, setRequestOn] = useState(false);
  const [requestDocs, setRequestDocs] = useState<DocId[]>([]);
  const [requestFor, setRequestFor] = useState<ClientDoc | null>(null);   // row action modal
  /** Results of the last send per client: the link can only be copied right after sending. */
  const [sent, setSent] = useState<Record<string, SentResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userDoc.uid) return;
    Promise.all([getClients(userDoc.uid), getCases(userDoc.uid)])
      .then(([cls, cs]) => { setClients(cls); setCases(cs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setError('');
    setRequestOn(false);
    setRequestDocs(requestableDocs.length === 1 ? [requestableDocs[0].id] : []);
    setShowModal(true);
  };

  /** Server summary → local list (status chip, actions). */
  const applyRequest = (clientId: string, r: SentResult | { id: string; status: SentResult['status'] }, documents?: DocId[]) => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      dataRequest: {
        id: r.id, status: r.status, documents: documents ?? c.dataRequest?.documents,
        expiresAt: 'link' in r ? new Date(Date.now() + 14 * 86_400_000).toISOString() : c.dataRequest?.expiresAt,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const sendRequest = async (client: { id: string }, documents: DocId[]) => {
    const r = await createRequest(user, client.id, documents);
    setSent(p => ({ ...p, [client.id]: r }));
    applyRequest(client.id, r, documents);
    return r;
  };

  const rowAction = async (c: ClientDoc, action: 'resend' | 'revoke') => {
    if (!c.dataRequest) return;
    setBusy(`${c.id}:${action}`);
    setRowError(p => ({ ...p, [c.id]: '' }));
    try {
      if (action === 'resend') {
        const r = await resendRequest(user, c.dataRequest.id);
        setSent(p => ({ ...p, [c.id]: r }));
        applyRequest(c.id, r);
      } else {
        const r = await revokeRequest(user, c.dataRequest.id);
        setSent(p => { const n = { ...p }; delete n[c.id]; return n; });
        applyRequest(c.id, r);
      }
    } catch (e) {
      setRowError(p => ({ ...p, [c.id]: (e as Error).message }));
    } finally {
      setBusy(null);
    }
  };

  const openRequestFor = (c: ClientDoc) => {
    setRequestFor(c);
    setRequestDocs(c.dataRequest?.documents?.length ? c.dataRequest.documents : requestableDocs.length === 1 ? [requestableDocs[0].id] : []);
    setError('');
  };

  const submitRequestFor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestFor) return;
    if (requestDocs.length === 0) return setError('Elige al menos un documento.');
    setSaving(true);
    setError('');
    try {
      await sendRequest(requestFor, requestDocs);
      setRequestFor(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (client: ClientDoc) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
      idType: client.idType ?? 'RUT',
      idNumber: client.idNumber ?? '',
      representativeCapacity: client.representativeCapacity ?? '',
      address: client.address ?? '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    const wantsRequest = !editingClient && requestOn;
    if (wantsRequest && !isValidEmail(form.email.trim().toLowerCase())) return setError('Indica un email válido para enviarle el enlace.');
    if (wantsRequest && requestDocs.length === 0) return setError('Elige al menos un documento.');
    if (!db) return setError('Base de datos no disponible.');
    setError('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      idType: form.idType,
      idNumber: form.idNumber.trim(),
      representativeCapacity: form.representativeCapacity.trim(),
      address: form.address.trim(),
    };

    try {
      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setClients(prev => prev.map(c =>
          c.id === editingClient.id ? { ...c, ...payload } : c
        ));
      } else {
        const docRef = await addDoc(collection(db, 'clients'), {
          userId: userDoc.uid,
          ...payload,
          activeCases: 0,
          lastCaseDate: serverTimestamp(),
          status: 'active',
          createdAt: serverTimestamp(),
        });
        const newClient: ClientDoc = {
          id: docRef.id,
          userId: userDoc.uid,
          ...payload,
          activeCases: 0,
          lastCaseDate: null as unknown as Timestamp,
          status: 'active',
        };
        setClients(prev => [newClient, ...prev]);
        if (wantsRequest) {
          try {
            await sendRequest(newClient, requestDocs);
          } catch (err) {
            setRowError(p => ({ ...p, [newClient.id]: `Cliente guardado, pero no se pudo enviar la solicitud: ${(err as Error).message}` }));
          }
        }
      }
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
          <Button variant="accent" size="sm" onClick={openCreate}>
            + Nuevo cliente
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-small text-text-muted mb-4">No hay clientes registrados aún.</p>
            <Button variant="accent" size="md" onClick={openCreate}>Añadir primer cliente</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {(() => {
              const activeCasesByClientId = cases.reduce<Record<string, number>>((acc, c) => {
                if (c.clientId && (c.status === 'active' || c.status === 'urgent')) {
                  acc[c.clientId] = (acc[c.clientId] ?? 0) + 1;
                }
                return acc;
              }, {});
              return (
            <table className="w-full text-caption font-sans">
              <thead>
                <tr className="border-b border-border">
                  {['Cliente', 'Email', 'Datos', 'Casos activos', 'Último caso', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-label font-semibold tracking-widest uppercase text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-surface-muted transition-colors group">
                    <td className="px-4 py-3 font-medium text-text">
                      <div>{c.name}</div>
                      {c.company && <div className="text-caption text-text-muted">{c.company}</div>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{c.email || '—'}</td>
                    <td className="px-4 py-3 align-top min-w-[220px]">
                      {(() => {
                        const st = requestStatus(c.dataRequest);
                        if (!st || !c.dataRequest) return <span className="text-text-muted">—</span>;
                        const pending = st === 'enviada' || st === 'abierta';
                        return (
                          <div className="space-y-1.5">
                            <RequestStatusChip status={st} />
                            {st === 'completada' && <PrepareLinks clientId={c.id} dr={c.dataRequest} />}
                            {st !== 'completada' && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <button type="button" onClick={() => rowAction(c, 'resend')} disabled={!!busy}
                                  className="text-caption text-text-muted hover:text-accent-text disabled:opacity-50">
                                  {busy === `${c.id}:resend` ? 'Reenviando…' : 'Reenviar'}
                                </button>
                                {pending && (
                                  <button type="button" onClick={() => rowAction(c, 'revoke')} disabled={!!busy}
                                    className="text-caption text-text-muted hover:text-danger-text disabled:opacity-50">
                                    {busy === `${c.id}:revoke` ? 'Anulando…' : 'Anular'}
                                  </button>
                                )}
                              </div>
                            )}
                            {sent[c.id] && pending && <SentNotice email={c.email} result={sent[c.id]} />}
                            {rowError[c.id] && <p className="text-caption text-danger-text">{rowError[c.id]}</p>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-text">{activeCasesByClientId[c.id] ?? 0}</td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(c.lastCaseDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-caption font-medium border ${c.status === 'active' ? 'bg-success-subtle text-success-text border-status-a-tiempo-border' : 'bg-surface-raised text-text-muted border-border'}`}>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {requestableDocs.length > 0 && c.email && (
                        <button
                          onClick={() => openRequestFor(c)}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-caption text-text-muted hover:text-accent-text border border-transparent hover:border-accent-border px-2.5 py-1 rounded-md"
                        >
                          Solicitar datos
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-caption text-text-muted hover:text-accent-text border border-transparent hover:border-accent-border px-2.5 py-1 rounded-md"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-elevated">
            <h2 className="font-display text-h3 text-text-heading mb-5">
              {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {error && <p className="text-caption text-danger-text">{error}</p>}

              <p className="text-label font-semibold uppercase tracking-widest text-text-muted">Datos de contacto</p>
              {[
                { label: 'Nombre *', field: 'name', type: 'text', placeholder: 'Nombre completo' },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'email@dominio.com' },
                { label: 'Teléfono', field: 'phone', type: 'tel', placeholder: '+56 9 0000 0000' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={form[field as keyof NewClientForm]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border"
                  />
                </div>
              ))}

              {!editingClient && requestableDocs.length > 0 && form.email.trim() && (
                <div className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-3 space-y-2">
                  <p className="text-label font-semibold uppercase tracking-widest text-accent-text">Solicitar los datos al cliente</p>
                  <label className="flex items-center justify-between gap-3 text-small text-text cursor-pointer">
                    <span>Enviar un enlace para que complete sus datos</span>
                    <input type="checkbox" role="switch" aria-checked={requestOn} checked={requestOn}
                      onChange={e => setRequestOn(e.target.checked)} className="h-4 w-4" />
                  </label>
                  {requestOn && (
                    <>
                      <DocPicker docs={requestableDocs} value={requestDocs} onChange={setRequestDocs} />
                      <p className="text-caption text-text-muted">Solo necesitas nombre y email. El resto lo completará el cliente.</p>
                    </>
                  )}
                </div>
              )}

              {!(requestOn && !editingClient) && <>
              <p className="text-label font-semibold uppercase tracking-widest text-text-muted pt-2">Información legal</p>
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">Empresa / Organización</label>
                <input type="text" placeholder="Nombre de la empresa"
                  value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">Tipo ID</label>
                  <select value={form.idType} onChange={e => setForm(p => ({ ...p, idType: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border">
                    {['RUT', 'DNI', 'Pasaporte', 'Cédula', 'CUIT', 'NIF', 'Otro'].map(t => (
                      <option key={t} value={t} className="bg-bg">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">Número ID</label>
                  <input type="text" placeholder="12.345.678-9"
                    value={form.idNumber}
                    onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border"
                  />
                </div>
              </div>
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">Cargo / Calidad</label>
                <input type="text" placeholder="Ej: Gerente General, Representante Legal"
                  value={form.representativeCapacity}
                  onChange={e => setForm(p => ({ ...p, representativeCapacity: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border"
                />
              </div>
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">Dirección</label>
                <input type="text" placeholder="Calle, número, ciudad, país"
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border"
                />
              </div>
              </>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" variant="accent" size="md" fullWidth loading={saving}>
                  {editingClient ? 'Guardar cambios' : requestOn ? 'Guardar y enviar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requestFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRequestFor(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="request-title" className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-elevated">
            <h2 id="request-title" className="font-display text-h3 text-text-heading mb-1">Solicitar datos</h2>
            <p className="text-caption text-text-muted mb-4">
              Enviaremos a <span className="text-text">{requestFor.email}</span> un enlace para que {requestFor.name} complete los datos
              que necesitan estos documentos. Caduca en 14 días.
              {requestFor.dataRequest && ['enviada', 'abierta'].includes(requestFor.dataRequest.status) && ' El enlace anterior dejará de funcionar.'}
            </p>
            <form onSubmit={submitRequestFor} className="space-y-4">
              {error && <p className="text-caption text-danger-text">{error}</p>}
              <DocPicker docs={requestableDocs} value={requestDocs} onChange={setRequestDocs} />
              <div className="flex gap-3">
                <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setRequestFor(null)}>Cancelar</Button>
                <Button type="submit" variant="accent" size="md" fullWidth icon={Send} loading={saving}>Enviar enlace</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
