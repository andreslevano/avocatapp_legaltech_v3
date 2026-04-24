'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { checkUserStatus, reactivateUserAccount } from '@/lib/user-reactivation';
import { trackSignupStart, trackRegistrationConversion } from '@/lib/gtag';
import { isPilotUser } from '@/lib/pilot-users';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { SUBSCRIPTION_PRICE_IDS } from '@/lib/subscription-prices';
import AccountReactivationModal from '@/components/AccountReactivationModal';
import PlanCards from '@/components/auth/PlanCards';
import type { Plan } from '@/components/auth/PlanCards';
import { Button } from '@/components/ui/Button';

const PLAN_DASHBOARDS: Record<string, string> = {
  Estudiantes: '/dashboard/estudiantes',
  'Autoservicio': '/dashboard/autoservicio/revision-email',
  Abogados: '/dashboard',
};

const COUNTRIES = ['Chile', 'Colombia', 'Ecuador', 'España', 'Mexico', 'Peru'];

export default function SignupForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    password: '',
    confirmPassword: '',
    firm: '',
    phone: '',
    plan: '' as Plan | '',
  });
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
    const planParam = params.get('plan')?.toLowerCase();
    const planMap: Record<string, Plan> = {
      abogados: 'Abogados',
      estudiantes: 'Estudiantes',
      autoservicio: 'Autoservicio',
    };
    const mapped = planParam ? planMap[planParam] : undefined;
    if (mapped) setForm(prev => ({ ...prev, plan: mapped }));
  }, []);

  useEffect(() => {
    const onInteract = () => trackSignupStart();
    document.addEventListener('focusin', onInteract, { once: true });
    return () => document.removeEventListener('focusin', onInteract);
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleReactivation = async () => {
    if (!reactivationUser) return;
    setIsLoading(true);
    try {
      const result = await reactivateUserAccount(reactivationUser.uid);
      if (result.success) {
        await signInWithEmailAndPassword(auth as Auth, reactivationUser.email, form.password);
        setSuccess('¡Cuenta reactivada! Redirigiendo...');
        setShowReactivation(false);
        setTimeout(() => router.push(PLAN_DASHBOARDS[form.plan] ?? '/dashboard'), 2000);
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
            plan: form.plan || null,
            onboardingComplete: !!form.plan,
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

      const dashboardUrl = PLAN_DASHBOARDS[form.plan] ?? '/dashboard';
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const priceId =
        !pilot && form.plan === 'Abogados' ? SUBSCRIPTION_PRICE_IDS.Abogados
        : !pilot && form.plan === 'Autoservicio' ? SUBSCRIPTION_PRICE_IDS.Autoservicio
        : null;

      if (priceId && user) {
        try {
          const res = await fetch(getCheckoutSessionEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              customerEmail: form.email,
              subscriptionPlan: form.plan,
              priceId,
              successUrl: `${baseUrl}${dashboardUrl}`,
              cancelUrl: `${baseUrl}/signup`,
            }),
          });
          const data = await res.json();
          if (data.success && data.url) { window.location.href = data.url; return; }
        } catch (err) {
          console.error('Checkout error:', err);
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-small text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-avocat-gold-bg border border-avocat-gold-l px-4 py-3 text-small text-avocat-black">
            {success}
          </div>
        )}

        {/* Plan selection */}
        <PlanCards selected={form.plan} onChange={plan => setForm(prev => ({ ...prev, plan }))} />

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Nombre *</label>
            <input type="text" required value={form.firstName} onChange={set('firstName')} placeholder="Tu nombre" className="input-field" />
          </div>
          <div>
            <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Apellido *</label>
            <input type="text" required value={form.lastName} onChange={set('lastName')} placeholder="Tu apellido" className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Email *</label>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" className="input-field" />
        </div>

        <div>
          <label className="block text-small font-medium text-avocat-gray5 mb-1.5">País *</label>
          <select required value={form.country} onChange={set('country')} className="input-field">
            <option value="">Selecciona tu país</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {form.plan === 'Abogados' && (
          <div>
            <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Bufete (opcional)</label>
            <input type="text" value={form.firm} onChange={set('firm')} placeholder="Nombre del bufete" className="input-field" />
          </div>
        )}

        <div>
          <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Contraseña *</label>
          <input type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" className="input-field" />
        </div>

        <div>
          <label className="block text-small font-medium text-avocat-gray5 mb-1.5">Confirmar contraseña *</label>
          <input type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repite tu contraseña" className="input-field" />
        </div>

        <Button type="submit" variant="BtnGold" size="lg" fullWidth loading={isLoading}>
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>

        <p className="text-center text-small text-avocat-gray5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-avocat-gold font-medium hover:underline">Inicia sesión</Link>
        </p>

        <p className="text-center text-[11px] text-avocat-gray9">
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
