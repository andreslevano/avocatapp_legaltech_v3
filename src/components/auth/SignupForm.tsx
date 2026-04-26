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

  const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <>
      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-md border border-avocat-border bg-white text-small font-medium text-avocat-black hover:bg-avocat-muted transition-colors disabled:opacity-50 mb-4"
      >
        <GoogleIcon />
        Registrarse con Google
      </button>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-avocat-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-avocat-cream text-small text-avocat-gray9">o regístrate con email</span>
        </div>
      </div>

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
