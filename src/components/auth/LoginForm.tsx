'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { handleUserReactivation } from '@/lib/user-reactivation';
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
        setTimeout(() => router.push('/dashboard'), 2500);
      } else {
        router.push('/dashboard');
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
  );
}
