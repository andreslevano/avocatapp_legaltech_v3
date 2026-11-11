'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { handleUserReactivation } from '@/lib/user-reactivation';
import { ensureUserDoc, getDashboardRoute } from '@/lib/auth';
import { signInWithGoogle } from '@/lib/google-auth';
import { Button } from '@/components/ui/Button';
import GoogleIcon from '@/components/brand/GoogleIcon';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (auth && typeof auth === 'object' && Object.keys(auth).length > 0) {
      setIsFirebaseReady(true);
    } else {
      const t = setTimeout(() => setIsFirebaseReady(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('passwordReset') === 'success') {
      setSuccessMsg('Contraseña restablecida. Inicia sesión con tu nueva contraseña.');
      router.replace('/login', { scroll: false });
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { redirectTo } = await signInWithGoogle();
      router.push(redirectTo);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión con Google. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady) return setError('Firebase no está listo. Recarga la página.');
    setError('');
    setIsLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth as Auth, email, password);
      const result = await handleUserReactivation(credential.user);
      if (result.wasReactivated) {
        setSuccessMsg(result.message || 'Cuenta reactivada. Redirigiendo...');
        const userDoc = await ensureUserDoc(credential.user.uid, credential.user.email ?? '', credential.user.displayName ?? '');
        setTimeout(() => router.push(getDashboardRoute(userDoc?.plan ?? null)), 2500);
      } else {
        const userDoc = await ensureUserDoc(credential.user.uid, credential.user.email ?? '', credential.user.displayName ?? '');
        router.push(getDashboardRoute(userDoc?.plan ?? null));
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con este email.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-email': 'Email inválido.',
        'auth/invalid-credential': 'Credenciales incorrectas.',
      };
      setError(msg[err.code] || 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-5">
      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-md border border-border bg-surface text-small font-medium text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-bg text-small text-text-muted">o continúa con email</span>
        </div>
      </div>

    <form onSubmit={handleSubmit} className="space-y-5">
      {successMsg && (
        <div className="rounded-md bg-accent-subtle border border-accent-border px-4 py-3 text-small text-text">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-danger-subtle border border-status-urgente-border px-4 py-3 text-small text-danger-text">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-small font-medium text-text-muted mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="password" className="block text-small font-medium text-text-muted">
            Contraseña
          </label>
          <Link href="/forgot-password" className="text-small text-accent-text hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Tu contraseña"
          className="w-full h-control-md px-3 border border-border-strong rounded-md bg-surface text-text"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>

      <p className="text-center text-small text-text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="text-accent-text font-medium hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </form>
    </div>
  );
}
