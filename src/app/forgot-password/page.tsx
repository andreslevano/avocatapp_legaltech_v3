'use client';

import { useState, useEffect } from 'react';
import { sendPasswordResetEmail, Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (auth && typeof auth === 'object' && Object.keys(auth).length > 0) {
      setIsFirebaseReady(true);
    } else {
      // If Firebase is not ready, set a timeout to try again
      const timer = setTimeout(() => {
        setIsFirebaseReady(true); // Force ready after timeout
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseReady) {
      setError('Firebase no está listo. Intenta recargar la página.');
      return;
    }

    setError('');
    setIsLoading(true);
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth as Auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      });
      setSuccess(true);
    } catch (error: any) {
      console.error('Error al enviar email de recuperación:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este email');
          break;
        case 'auth/invalid-email':
          setError('Email inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Por favor, espera un momento e inténtalo de nuevo.');
          break;
        default:
          setError('Error al enviar el email de recuperación. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="space-y-6">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Email enviado
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Te hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>
                      </p>
                      <p className="mt-2">
                        Revisa tu bandeja de entrada y haz clic en el enlace para crear una nueva contraseña.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-500">
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 input-field"
                  placeholder="tu@email.com"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 px-4 text-base font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </div>

              <div className="text-center">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-500">
                  Volver al inicio de sesión
                </Link>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿No tienes una cuenta?{' '}
                  <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}




