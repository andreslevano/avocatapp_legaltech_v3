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

  const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <div className="space-y-5">
      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-md border border-avocat-border bg-white text-small font-medium text-avocat-black hover:bg-avocat-muted transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-avocat-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-avocat-cream text-small text-avocat-gray9">o continúa con email</span>
        </div>
      </div>

    <form onSubmit={handleSubmit} className="space-y-5">
      {successMsg && (
        <div className="rounded-md bg-avocat-gold-bg border border-avocat-gold-l px-4 py-3 text-small text-avocat-black">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-small text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-small font-medium text-avocat-gray5 mb-1.5">
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
          className="input-field"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="password" className="block text-small font-medium text-avocat-gray5">
            Contraseña
          </label>
          <Link href="/forgot-password" className="text-small text-avocat-gold hover:underline">
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
          className="input-field"
        />
      </div>

      <Button type="submit" variant="BtnDark" size="lg" fullWidth loading={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>

      <p className="text-center text-small text-avocat-gray5">
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="text-avocat-gold font-medium hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </form>
    </div>
  );
}
