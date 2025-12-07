'use client';

import { useState, useEffect } from 'react';
import { sendPasswordResetEmail, Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
<<<<<<< HEAD
import { useI18n } from '@/hooks/useI18n';
=======
import { useRouter } from 'next/navigation';
>>>>>>> dev

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
<<<<<<< HEAD
  const { t } = useI18n();
=======
  const router = useRouter();
>>>>>>> dev

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

<<<<<<< HEAD
    setError('');
    setIsLoading(true);
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth as Auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      });
=======
    if (!email) {
      setError('Por favor, ingresa tu dirección de correo electrónico.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Configure action code settings to redirect to our app
      const actionCodeSettings = {
        url: typeof window !== 'undefined' 
          ? `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`
          : `${process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com'}/reset-password?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth as Auth, email, actionCodeSettings);
>>>>>>> dev
      setSuccess(true);
    } catch (error: any) {
      console.error('Error al enviar email de recuperación:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
<<<<<<< HEAD
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
=======
          setError('No existe una cuenta con este email.');
          break;
        case 'auth/invalid-email':
          setError('Email inválido. Por favor, verifica el formato.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Por favor, espera unos minutos antes de intentar de nuevo.');
          break;
        default:
          setError('Error al enviar el email de recuperación. Intenta de nuevo más tarde.');
>>>>>>> dev
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
<<<<<<< HEAD
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
=======
          <p className="mt-4 text-gray-600">Cargando...</p>
>>>>>>> dev
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
<<<<<<< HEAD
                      Email enviado
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Te hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>
                      </p>
                      <p className="mt-2">
                        Revisa tu bandeja de entrada y haz clic en el enlace para crear una nueva contraseña.
=======
                      Email enviado exitosamente
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Hemos enviado un enlace de recuperación de contraseña a <strong>{email}</strong>
                      </p>
                      <p className="mt-2">
                        Por favor, revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
                      </p>
                      <p className="mt-2 text-xs">
                        Si no encuentras el email, revisa tu carpeta de spam o correo no deseado.
>>>>>>> dev
                      </p>
                    </div>
                  </div>
                </div>
              </div>
<<<<<<< HEAD
              <div className="text-center">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-500">
=======

              <div className="text-center space-y-4">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="w-full btn-secondary py-2 px-4 text-sm font-medium"
                >
                  Enviar otro email
                </button>
                <Link
                  href="/login"
                  className="block text-sm text-primary-600 hover:text-primary-500"
                >
>>>>>>> dev
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
<<<<<<< HEAD
                  Email
=======
                  Dirección de correo electrónico
>>>>>>> dev
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
<<<<<<< HEAD
                  <div className="text-sm text-red-700">{error}</div>
=======
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  </div>
>>>>>>> dev
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
<<<<<<< HEAD
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
=======
                <Link
                  href="/login"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
>>>>>>> dev
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD



=======
>>>>>>> dev
