'use client';

// /pago — where an account without a valid payment lands (src/lib/billing/access.ts):
//   · back from Stripe without paying, or never reached it → «Continuar al pago»
//   · back from Stripe after paying (?checkout=ok) → waits for the webhook's confirmation
//   · cancelled subscription / failed payment past the grace → portal or a new checkout
// Always: «Cambiar de plan» and «Cerrar sesión». Once access is valid, goes to the app.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { CreditCard, Loader2, LogOut } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { accessForUserDoc, ACCESS_MESSAGE, type Access, type BillingRecord } from '@/lib/billing/access';
import { isPilotUser } from '@/lib/pilot-users';
import { PLAN_DASHBOARDS } from '@/lib/plans';
import { isCountryCode } from '@/lib/pricing';

const CONFIRM_TIMEOUT_MS = 90_000;

function PagoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returned = params?.get('checkout') ?? null; // 'ok' | 'cancelado' | null
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [waitedOut, setWaitedOut] = useState(false);

  useEffect(() => {
    if (!auth || !db) return;
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      unsubDoc?.();
      unsubDoc = onSnapshot(doc(db!, 'users', u.uid), snap => {
        const d = snap.exists() ? snap.data() : null;
        if (!d?.plan) { router.replace('/onboarding'); return; }
        setData(d);
        setAccess(accessForUserDoc(d, { pilot: isPilotUser(u.email) }));
      });
    });
    return () => { unsubAuth(); unsubDoc?.(); };
  }, [router]);

  // Access is valid (paid, trialing, legacy…): into the app.
  const plan = data?.plan as keyof typeof PLAN_DASHBOARDS | undefined;
  useEffect(() => {
    if (access?.allowed) {
      const t = setTimeout(() => router.replace(`${(plan && PLAN_DASHBOARDS[plan]) || '/agent'}${returned === 'ok' ? '?checkout=ok' : ''}`), returned === 'ok' ? 1200 : 0);
      return () => clearTimeout(t);
    }
  }, [access, plan, returned, router]);

  // Back from Stripe after paying: the webhook usually lands in a few seconds.
  useEffect(() => {
    if (returned !== 'ok') return;
    const t = setTimeout(() => setWaitedOut(true), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [returned]);

  const billing = (data?.billing ?? null) as BillingRecord | null;

  const continueToPayment = async () => {
    if (!user) return;
    setBusy('checkout'); setError('');
    const item = billing?.item ?? (plan === 'Autoservicio' ? 'particular' : 'abogado');
    const rawCountry = billing?.country ?? (data?.country as string | undefined);
    const country = rawCountry && isCountryCode(rawCountry) ? rawCountry.toUpperCase() : 'ES';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ item, country, interval: billing?.interval ?? 'monthly' }),
      });
      const r = await res.json().catch(() => ({})) as { url?: string; available?: boolean; error?: string };
      if (r.url) { window.location.href = r.url; return; }
      setError(r.available === false
        ? 'El pago de este plan aún no está disponible en tu país. Elige otro plan o escríbenos y te avisamos.'
        : r.error ?? 'No se pudo abrir el pago. Inténtalo de nuevo.');
    } catch { setError('No se pudo abrir el pago. Inténtalo de nuevo.'); }
    setBusy('');
  };

  const openPortal = async () => {
    if (!user) return;
    setBusy('portal'); setError('');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ returnPath: '/pago' }),
      });
      const r = await res.json().catch(() => ({})) as { url?: string };
      if (r.url) { window.location.href = r.url; return; }
      setError('No se pudo abrir el portal de pagos. Inténtalo de nuevo o escríbenos a hola@avocatapp.com.');
    } catch { setError('No se pudo abrir el portal de pagos.'); }
    setBusy('');
  };

  const logout = async () => { if (auth) await signOut(auth); router.replace('/login'); };

  const waiting = returned === 'ok' && !waitedOut && (!access || !access.allowed);
  const blocked = access && !access.allowed ? access : null;

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-bg">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 shadow-sm space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-subtle text-accent-text flex items-center justify-center">
          {waiting || !access ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <CreditCard size={22} aria-hidden />}
        </div>

        {!access ? (
          <p className="text-body-sm text-text-muted" aria-live="polite">Cargando tu cuenta…</p>
        ) : access.allowed ? (
          <div aria-live="polite">
            <h1 className="font-display text-h2 text-text-heading">{returned === 'ok' ? 'Pago confirmado' : 'Todo en orden'}</h1>
            <p className="text-body-sm text-text-muted mt-2">Te llevamos a Avocat…</p>
          </div>
        ) : waiting ? (
          <div aria-live="polite">
            <h1 className="font-display text-h2 text-text-heading">Confirmando tu pago</h1>
            <p className="text-body-sm text-text-muted mt-2">Stripe nos está enviando la confirmación. Suele tardar unos segundos; no cierres esta página.</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="font-display text-h2 text-text-heading">
                {blocked?.reason === 'payment_pending' ? 'Completa tu pago' : blocked?.reason === 'payment_failed' ? 'Actualiza tu método de pago' : 'Suscripción cancelada'}
              </h1>
              <p className="text-body-sm text-text-muted mt-2">
                {returned === 'ok' && waitedOut
                  ? 'Aún no hemos recibido la confirmación de Stripe. Si ya pagaste, espera unos minutos y recarga esta página, o escríbenos a hola@avocatapp.com.'
                  : returned === 'cancelado' && blocked?.reason === 'payment_pending'
                    ? 'No se completó el pago. Tu cuenta está creada: termina el pago para empezar a usar Avocat.'
                    : ACCESS_MESSAGE[blocked!.reason]}
              </p>
            </div>

            <div className="space-y-2">
              {blocked?.reason === 'payment_failed' ? (
                <Button variant="primary" block loading={busy === 'portal'} onClick={openPortal}>Actualizar método de pago</Button>
              ) : (
                <Button variant="primary" block loading={busy === 'checkout'} onClick={continueToPayment}>
                  {blocked?.reason === 'canceled' ? 'Contratar de nuevo' : 'Continuar al pago'}
                </Button>
              )}
              {blocked?.reason === 'canceled' && !!data?.stripe_customer_id && (
                <Button variant="secondary" block loading={busy === 'portal'} onClick={openPortal}>Ver facturas y suscripción</Button>
              )}
              <Link href="/precios" className="block text-body-sm text-accent-text hover:underline py-1">Cambiar de plan</Link>
            </div>
          </>
        )}

        {error && <p role="alert" className="text-body-sm text-danger-text">{error}</p>}

        {user && (
          <div className="pt-3 border-t border-border flex items-center justify-between text-caption text-text-muted">
            <span className="truncate">{user.email}</span>
            <button onClick={logout} className="inline-flex items-center gap-1 hover:text-text"><LogOut size={14} aria-hidden /> Cerrar sesión</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function PagoPage() {
  return <Suspense><PagoInner /></Suspense>;
}
