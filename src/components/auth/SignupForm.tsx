'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { signInWithGoogle } from '@/lib/google-auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { checkUserStatus, reactivateUserAccount } from '@/lib/user-reactivation';
import { trackSignupStart, trackRegistrationConversion } from '@/lib/gtag';
import { isPilotUser } from '@/lib/pilot-users';
import { PLAN_DASHBOARDS } from '@/lib/plans';
import {
  COUNTRY_COOKIE, planById, pricingPlanFromParam, resolveCountryFrom,
  type Availability, type CountryCode, type Interval, type PricingPlanId,
} from '@/lib/pricing';
import AccountReactivationModal from '@/components/AccountReactivationModal';
import PlanCards from '@/components/auth/PlanCards';
import BillingToggle from '@/components/pricing/BillingToggle';
import { Button } from '@/components/ui/Button';
import GoogleIcon from '@/components/brand/GoogleIcon';

// Stored values stay as before (existing user docs); labels use the Spanish spelling.
/** Signup country → pricing country (Ecuador has no local pricing yet: keeps the current one). */
const PRICING_COUNTRY: Record<string, CountryCode> = { Chile: 'CL', Colombia: 'CO', 'España': 'ES', Mexico: 'MX', Peru: 'PE' };

const COUNTRIES: { value: string; label: string }[] = [
  { value: 'Chile', label: 'Chile' }, { value: 'Colombia', label: 'Colombia' }, { value: 'Ecuador', label: 'Ecuador' },
  { value: 'España', label: 'España' }, { value: 'Mexico', label: 'México' }, { value: 'Peru', label: 'Perú' },
];

interface SignupFormProps {
  /** Server-side availability (Stripe price ids present) — /signup page. */
  availability?: Availability;
  initialCountry?: CountryCode;
}

export default function SignupForm({ availability, initialCountry = 'ES' }: SignupFormProps = {}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    password: '',
    confirmPassword: '',
    firm: '',
    phone: '',
    plan: '' as PricingPlanId | '',
  });
  const [pricingCountry, setPricingCountry] = useState<CountryCode>(initialCountry);
  const [interval, setInterval] = useState<Interval>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [showReactivation, setShowReactivation] = useState(false);
  const [reactivationUser, setReactivationUser] = useState<{ uid: string; email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (auth && 'app' in (auth as object)) setIsFirebaseReady(true);
  }, []);

  // Pre-select plan from URL param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mapped = pricingPlanFromParam(params.get('plan'));
    if (mapped && mapped !== 'empresa-medida') setForm(prev => ({ ...prev, plan: mapped }));
    if (mapped === 'empresa-medida') window.location.replace('/contacto?motivo=empresa&plan=empresa-medida');
    if (params.get('periodo') === 'anual') setInterval('annual');
    const cookie = document.cookie.split('; ').find(c => c.startsWith(`${COUNTRY_COOKIE}=`))?.split('=')[1];
    if (params.get('pais') || cookie) setPricingCountry(resolveCountryFrom({ param: params.get('pais'), cookie }));
  }, []);

  useEffect(() => {
    const onInteract = () => trackSignupStart();
    document.addEventListener('focusin', onInteract, { once: true });
    return () => document.removeEventListener('focusin', onInteract);
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (field === 'country' && PRICING_COUNTRY[e.target.value]) setPricingCountry(PRICING_COUNTRY[e.target.value]);
  };
  const stored = form.plan ? planById(form.plan).stored : undefined;

  const handleGoogleSignup = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { redirectTo } = await signInWithGoogle();
      router.push(redirectTo);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') {
        setError('Error al registrarse con Google. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivation = async () => {
    if (!reactivationUser) return;
    setIsLoading(true);
    try {
      const result = await reactivateUserAccount(reactivationUser.uid);
      if (result.success) {
        await signInWithEmailAndPassword(auth as Auth, reactivationUser.email, form.password);
        setSuccess('¡Cuenta reactivada! Redirigiendo...');
        setShowReactivation(false);
        setTimeout(() => router.push((stored ? PLAN_DASHBOARDS[stored] : undefined) ?? '/panel'), 2000);
      } else {
        setError(result.message || 'Error al reactivar la cuenta.');
      }
    } catch (err: any) {
      setError(err.code === 'auth/wrong-password' ? 'Contraseña incorrecta.' : 'Error al reactivar la cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady) return setError('Firebase no está listo. Recarga la página.');
    if (!form.plan) return setError('Selecciona un plan para continuar.');
    if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden.');
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth as Auth, form.email, form.password);
      const user = credential.user;
      const pilot = isPilotUser(form.email);
      const displayName = `${form.firstName} ${form.lastName}`.trim() || form.email.split('@')[0];

      if (user && db) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: form.email,
            displayName,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || null,
            country: form.country || null,
            plan: stored ?? null,
            onboardingComplete: !!stored,
            firm: form.firm || null,
            isAdmin: false,
            isActive: true,
            role: pilot ? 'pilot' : 'user',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            subscription: { plan: pilot ? 'premium' : 'free', startDate: serverTimestamp(), isActive: true },
            preferences: { language: 'es', notifications: true, theme: 'light' },
            stats: { totalDocuments: 0, totalGenerations: 0, totalSpent: 0 },
          });
        } catch (err) {
          console.error('Error creating user doc in Firestore:', err);
        }
      }

      trackRegistrationConversion();
      setSuccess('¡Cuenta creada! Redirigiendo...');

      const dashboardUrl = (stored ? PLAN_DASHBOARDS[stored] : undefined) ?? '/panel';
      const plan = form.plan ? planById(form.plan) : null;

      if (user) {
        const token = await user.getIdToken();
        // Welcome credits (D1): granted once, server-side (users can't write credits).
        fetch('/api/creditos/bienvenida', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

        // Checkout (D7): price id resolved on the server from env; Particular no longer opens the
        // legacy 50 €/mes subscription.
        if (!pilot && plan) {
          try {
            const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ item: plan.id, country: pricingCountry, interval }),
            });
            const data = await res.json().catch(() => ({})) as { url?: string; available?: boolean };
            if (data.url) { window.location.href = data.url; return; }
            if (data.available === false && plan.profile === 'empresa') {
              router.push(`/contacto?motivo=empresa&plan=${plan.id}&pais=${pricingCountry.toLowerCase()}`);
              return;
            }
          } catch (err) {
            console.error('Checkout error:', err);
          }
        }
      }

      router.push(dashboardUrl);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        const status = await checkUserStatus(form.email);
        if (status.exists && !status.isActive) {
          setReactivationUser({ uid: status.uid!, email: form.email });
          setShowReactivation(true);
        } else {
          setError('Este email ya está registrado.');
        }
      } else {
        const msgs: Record<string, string> = {
          'auth/invalid-email': 'Email inválido.',
          'auth/weak-password': 'Contraseña demasiado débil.',
        };
        setError(msgs[err.code] || 'Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-md border border-border bg-surface text-small font-medium text-text hover:bg-surface-muted transition-colors disabled:opacity-50 mb-4"
      >
        <GoogleIcon />
        Registrarse con Google
      </button>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-bg text-small text-text-muted">o regístrate con email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-danger-subtle border border-status-urgente-border px-4 py-3 text-small text-danger-text">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-accent-subtle border border-accent-border px-4 py-3 text-small text-text">
            {success}
          </div>
        )}

        {/* Plan selection */}
        <div className="flex justify-center"><BillingToggle value={interval} onChange={setInterval} /></div>
        <PlanCards selected={form.plan} onChange={plan => setForm(prev => ({ ...prev, plan }))}
          country={pricingCountry} interval={interval} availability={availability} />

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-small font-medium text-text-muted mb-1.5">Nombre *</label>
            <input type="text" required value={form.firstName} onChange={set('firstName')} placeholder="Tu nombre" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
          </div>
          <div>
            <label className="block text-small font-medium text-text-muted mb-1.5">Apellido *</label>
            <input type="text" required value={form.lastName} onChange={set('lastName')} placeholder="Tu apellido" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
          </div>
        </div>

        <div>
          <label className="block text-small font-medium text-text-muted mb-1.5">Email *</label>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
        </div>

        <div>
          <label className="block text-small font-medium text-text-muted mb-1.5">País *</label>
          <select required value={form.country} onChange={set('country')} className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text">
            <option value="">Selecciona tu país</option>
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {stored === 'Abogados' && (
          <div>
            <label className="block text-small font-medium text-text-muted mb-1.5">Bufete (opcional)</label>
            <input type="text" value={form.firm} onChange={set('firm')} placeholder="Nombre del bufete" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
          </div>
        )}

        <div>
          <label className="block text-small font-medium text-text-muted mb-1.5">Contraseña *</label>
          <input type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
        </div>

        <div>
          <label className="block text-small font-medium text-text-muted mb-1.5">Confirmar contraseña *</label>
          <input type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repite tu contraseña" className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text" />
        </div>

        <Button type="submit" variant="accent" size="lg" fullWidth loading={isLoading}>
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>

        <p className="text-center text-small text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-accent-text font-medium hover:underline">Inicia sesión</Link>
        </p>

        <p className="text-center text-caption text-text-muted">
          Al continuar aceptas los{' '}
          <Link href="/terminos" className="hover:underline">Términos</Link> y la{' '}
          <Link href="/privacidad" className="hover:underline">Política de Privacidad</Link>.
        </p>
      </form>

      {showReactivation && reactivationUser && (
        <AccountReactivationModal
          isOpen={showReactivation}
          onClose={() => { setShowReactivation(false); setReactivationUser(null); }}
          onConfirm={handleReactivation}
          userEmail={reactivationUser.email}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
