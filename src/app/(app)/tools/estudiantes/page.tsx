'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { CircleCheck, GraduationCap, X } from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────

const legalAreas: Record<string, { name: string; price: number }[]> = {
  'Derecho Constitucional': [
    { name: 'Recurso de amparo ante el Tribunal Constitucional', price: 3 },
    { name: 'Recurso de inconstitucionalidad (modelo orientativo)', price: 3 },
    { name: 'Escrito de acción de protección de derechos fundamentales (ej. derecho de reunión, libertad de expresión)', price: 3 },
  ],
  'Derecho Civil y Procesal Civil': [
    { name: 'Demanda de reclamación de cantidad (juicio ordinario / juicio verbal / monitorio)', price: 3 },
    { name: 'Escrito de oposición a juicio monitorio', price: 3 },
    { name: 'Demanda de desahucio por falta de pago', price: 3 },
    { name: 'Escrito de medidas cautelares', price: 3 },
    { name: 'Recurso de apelación en proceso civil', price: 3 },
    { name: 'Demanda de responsabilidad contractual / extracontractual', price: 3 },
    { name: 'Escrito de ejecución de sentencia (ej. embargo de bienes)', price: 3 },
  ],
  'Derecho Penal y Procesal Penal': [
    { name: 'Denuncia y querella criminal', price: 3 },
    { name: 'Escrito de acusación particular', price: 3 },
    { name: 'Escrito de defensa', price: 3 },
    { name: 'Solicitud de medidas cautelares (ej. prisión preventiva, alejamiento)', price: 3 },
    { name: 'Recurso de reforma y subsidiario de apelación', price: 3 },
    { name: 'Escrito de personación como acusación particular', price: 3 },
    { name: 'Recurso de casación penal (modelo académico)', price: 3 },
  ],
  'Derecho Laboral (Jurisdicción Social)': [
    { name: 'Demanda por despido improcedente', price: 3 },
    { name: 'Demanda por reclamación de salarios', price: 3 },
    { name: 'Demanda por modificación sustancial de condiciones de trabajo', price: 3 },
    { name: 'Escrito de impugnación de sanción disciplinaria', price: 3 },
    { name: 'Escrito de ejecución de sentencia laboral', price: 3 },
  ],
  'Derecho Administrativo y Contencioso-Administrativo': [
    { name: 'Recurso administrativo de alzada', price: 3 },
    { name: 'Recurso potestativo de reposición', price: 3 },
    { name: 'Demanda contencioso-administrativa', price: 3 },
    { name: 'Medidas cautelares en vía contenciosa', price: 3 },
    { name: 'Escrito de personación en procedimiento contencioso', price: 3 },
    { name: 'Recurso de apelación en lo contencioso-administrativo', price: 3 },
  ],
  'Derecho Mercantil': [
    { name: 'Demanda de impugnación de acuerdos sociales', price: 3 },
    { name: 'Solicitud de concurso voluntario', price: 3 },
    { name: 'Demanda por competencia desleal', price: 3 },
    { name: 'Demanda por incumplimiento contractual mercantil', price: 3 },
    { name: 'Demanda cambiaria (ejecutiva)', price: 3 },
  ],
  'Recursos procesales transversales': [
    { name: 'Recurso de reposición', price: 3 },
    { name: 'Recurso de apelación', price: 3 },
    { name: 'Recurso de casación', price: 3 },
    { name: 'Recurso de queja', price: 3 },
    { name: 'Incidente de nulidad de actuaciones', price: 3 },
  ],
  'Derecho de Familia': [
    { name: 'Demanda de divorcio contencioso', price: 3 },
    { name: 'Demanda de medidas paternofiliales', price: 3 },
    { name: 'Solicitud de modificación de medidas', price: 3 },
    { name: 'Solicitud de guarda y custodia', price: 3 },
    { name: 'Demanda de alimentos', price: 3 },
    { name: 'Escrito de ejecución por impago de pensión alimenticia', price: 3 },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  name: string;
  area: string;
  price: number;
  quantity: number;
}

interface PurchaseDoc {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: Date;
  items: {
    id: string;
    name: string;
    area: string;
    price: number;
    quantity: number;
    downloadUrl?: string | null;
    packageFiles?: {
      studyMaterialPdf?: { downloadUrl: string };
      templatePdf?: { downloadUrl: string };
    };
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(v: Date | Timestamp | unknown): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === 'object' && v !== null && 'seconds' in v)
    return new Date((v as { seconds: number }).seconds * 1000);
  return new Date();
}

function getBestDownloadUrl(item: PurchaseDoc['items'][number]): string | null {
  return (
    item.packageFiles?.studyMaterialPdf?.downloadUrl ??
    item.packageFiles?.templatePdf?.downloadUrl ??
    item.downloadUrl ??
    null
  );
}

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

// ── Main component (wrapped in Suspense for useSearchParams) ──────────────────

function EstudiantesContent() {
  const { user, userDoc } = useAppAuth();
  const searchParams = useSearchParams();

  const [selectedArea, setSelectedArea] = useState(Object.keys(legalAreas)[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseDoc[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const isEstudiantes = userDoc.plan === 'Estudiantes';

  // Handle payment=success redirect
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true);
      setCart([]);
      window.history.replaceState({}, '', '/tools/estudiantes');
    }
  }, [searchParams]);

  // Load purchase history
  useEffect(() => {
    if (!user || !db || !isEstudiantes) return;
    setHistoryLoading(true);
    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    getDocs(q)
      .then((snap) => {
        const docs: PurchaseDoc[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              status: data.status ?? 'completed',
              total: Number(data.total ?? 0),
              currency: data.currency ?? 'EUR',
              createdAt: toDate(data.createdAt),
              items: (Array.isArray(data.items) ? data.items : []).map((item: Record<string, unknown>, i: number) => ({
                id: String(item.id ?? `${d.id}-${i}`),
                name: String(item.name ?? 'Documento'),
                area: String(item.area ?? ''),
                price: Number(item.price ?? 0),
                quantity: Number(item.quantity ?? 1),
                downloadUrl: (item.downloadUrl as string | null) ?? null,
                packageFiles: item.packageFiles as PurchaseDoc['items'][number]['packageFiles'],
              })),
            };
          })
          .filter((p) => p.items.some((item) => !item.area || item.area !== 'Colombia'));
        setPurchaseHistory(docs);
      })
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [user, isEstudiantes]);

  // ── Cart helpers ────────────────────────────────────────────────────────────

  function addToCart(name: string, area: string, price: number) {
    const id = `${area}::${name}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) return prev.map((i) => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, area, price, quantity: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Checkout ────────────────────────────────────────────────────────────────

  async function handleProceedToPayment() {
    if (!user || cart.length === 0) return;
    setError('');
    setIsProcessing(true);
    try {
      const endpoint = getCheckoutSessionEndpoint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            name: i.name,
            price: Math.round(i.price * 100),
            quantity: i.quantity,
            area: i.area,
            country: 'España',
          })),
          documentType: 'estudiantes',
          userId: user.uid,
          customerEmail: user.email ?? '',
          successUrl: `${window.location.origin}/tools/estudiantes?payment=success`,
          cancelUrl: `${window.location.origin}/tools/estudiantes?payment=cancelled`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'No se recibió URL de checkout');
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message ?? 'Error al procesar el pago. Inténtalo de nuevo.');
      setIsProcessing(false);
    }
  }

  // ── Non-Estudiantes locked state ────────────────────────────────────────────

  if (!isEstudiantes) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader
          title="Documentos por Área Legal"
          actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-sm text-center space-y-3">
            <GraduationCap size={32} className="text-accent-text" aria-hidden />
            <h3 className="font-display text-lg text-text-heading">Módulo exclusivo para Estudiantes</h3>
            <p className="text-caption text-text-muted leading-relaxed">
              Accede a más de 44 modelos de escritos académicos de las 8 áreas del derecho español por €3 cada uno.
            </p>
            <Link href="/subscription">
              <Button variant="accent" size="sm" className="mt-2">Ver planes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment success state ────────────────────────────────────────────────────

  if (showSuccess) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader
          title="Documentos por Área Legal"
          actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-sm text-center space-y-4">
            <CircleCheck size={40} className="text-success-text" aria-hidden />
            <h3 className="font-display text-lg text-text-heading">¡Pago completado!</h3>
            <p className="text-caption text-text-muted leading-relaxed">
              Tus documentos se están generando. Aparecerán en el historial de compras en unos momentos.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={() => setShowSuccess(false)}>
                Comprar más
              </Button>
              <Link href="/documents">
                <Button variant="accent" size="sm">Mis documentos</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────

  const areaKeys = Object.keys(legalAreas);
  const docsInArea = legalAreas[selectedArea] ?? [];

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Documentos por Área Legal"
        subtitle="Selecciona un área y añade escritos al carrito · €3 / documento"
        actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* ── Catalog ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Area selector */}
          <div className="lg:col-span-1 space-y-1">
            <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">
              Área del derecho
            </p>
            {areaKeys.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-caption font-sans transition-colors ${
                  selectedArea === area
                    ? 'bg-accent-subtle text-accent-text border border-accent-border'
                    : 'text-text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Document list */}
          <div className="lg:col-span-2">
            <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">
              {selectedArea}
            </p>
            <div className="space-y-2">
              {docsInArea.map((doc) => {
                const id = `${selectedArea}::${doc.name}`;
                const inCart = cart.find((i) => i.id === id);
                return (
                  <div
                    key={id}
                    className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <span className="text-caption font-sans text-text flex-1 leading-snug">{doc.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-caption font-sans text-accent-text font-semibold">{fmt.format(doc.price)}</span>
                      {inCart ? (
                        <button
                          onClick={() => removeFromCart(id)}
                          className="text-caption px-2 py-1 rounded bg-danger-subtle text-danger-text border border-status-urgente-border hover:bg-danger-subtle transition-colors"
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          onClick={() => addToCart(doc.name, selectedArea, doc.price)}
                          className="text-caption px-2 py-1 rounded bg-accent-subtle text-accent-text border border-accent-border hover:bg-accent-subtle transition-colors"
                        >
                          + Añadir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Cart ── */}
        {cart.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-semibold text-small text-text-heading">
                Carrito ({cart.reduce((s, i) => s + i.quantity, 0)} documento{cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''})
              </h3>
              <button
                onClick={() => setCart([])}
                className="text-caption text-text-muted hover:text-text-muted transition-colors"
              >
                Vaciar
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-caption">
                  <div className="flex-1 min-w-0">
                    <p className="text-text leading-snug truncate">{item.name}</p>
                    <p className="text-text-muted">{item.area}</p>
                  </div>
                  <span className="text-accent-text font-semibold shrink-0">
                    {fmt.format(item.price * item.quantity)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-text-muted hover:text-danger-text transition-colors shrink-0"
                    aria-label="Eliminar"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <div>
                <p className="text-label text-text-muted uppercase tracking-wider">Total</p>
                <p className="text-body-lg font-display font-semibold text-text-heading">{fmt.format(cartTotal)}</p>
              </div>
              <Button
                variant="accent"
                size="md"
                loading={isProcessing}
                onClick={handleProceedToPayment}
              >
                Pagar con Stripe
              </Button>
            </div>
            {error && <p className="mt-3 text-caption text-danger-text">{error}</p>}
          </div>
        )}

        {/* ── Purchase history ── */}
        <div>
          <h3 className="font-sans font-semibold text-small text-text-muted uppercase tracking-widest mb-3">
            Historial de compras
          </h3>
          {historyLoading ? (
            <p className="text-caption text-text-muted">Cargando...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="text-caption text-text-muted">Aún no has realizado ninguna compra.</p>
          ) : (
            <div className="space-y-3">
              {purchaseHistory.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-surface border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-caption font-sans font-semibold text-text">
                        {purchase.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                      <p className="text-caption text-text-muted">
                        {purchase.items.length} documento{purchase.items.length !== 1 ? 's' : ''} · {fmt.format(purchase.total)}
                      </p>
                    </div>
                    <span
                      className={`text-caption px-2 py-0.5 rounded-full font-sans ${
                        purchase.status === 'completed'
                          ? 'bg-success-subtle text-success-text'
                          : purchase.status === 'pending'
                          ? 'bg-warning-subtle text-warning-text'
                          : 'bg-danger-subtle text-danger-text'
                      }`}
                    >
                      {purchase.status === 'completed' ? 'Completada' : purchase.status === 'pending' ? 'En proceso' : purchase.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {purchase.items.map((item) => {
                      const url = getBestDownloadUrl(item);
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-caption text-text leading-snug">{item.name}</p>
                            {item.area && <p className="text-caption text-text-muted">{item.area}</p>}
                          </div>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-caption px-3 py-1.5 rounded-lg bg-accent-subtle text-accent-text border border-accent-border hover:bg-accent-subtle transition-colors shrink-0"
                            >
                              Descargar
                            </a>
                          ) : (
                            <span className="text-caption text-text-muted shrink-0">
                              {purchase.status === 'pending' ? 'Generando...' : 'No disponible'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EstudiantesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full">
        <AppHeader title="Documentos por Área Legal" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent-border border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <EstudiantesContent />
    </Suspense>
  );
}
