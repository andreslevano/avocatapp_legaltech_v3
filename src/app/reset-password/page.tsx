'use client';

import { useState, useEffect, Suspense } from 'react';
import { confirmPasswordReset, Auth, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// This page needs to be dynamic because it handles password reset codes from email links
export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (auth && typeof auth === 'object' && Object.keys(auth).length > 0) {
      setIsFirebaseReady(true);
    } else {
      const timer = setTimeout(() => {
        setIsFirebaseReady(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Verify the action code from the URL
    const verifyCode = async () => {
      if (!isFirebaseReady || !auth) return;

      const code = searchParams?.get('oobCode');
      if (!code) {
        setError('Código de restablecimiento no válido o faltante.');
        setIsVerifying(false);
        return;
      }

      try {
        // Verify the password reset code
        const email = await verifyPasswordResetCode(auth as Auth, code);
        setActionCode(code);
        setIsVerifying(false);
      } catch (error: any) {
        console.error('Error verificando código:', error);
        switch (error.code) {
          case 'auth/expired-action-code':
            setError('El enlace de restablecimiento ha expirado. Por favor, solicita uno nuevo.');
            break;
          case 'auth/invalid-action-code':
            setError('El enlace de restablecimiento no es válido. Por favor, solicita uno nuevo.');
            break;
          default:
            setError('Error al verificar el enlace. Por favor, solicita un nuevo enlace de restablecimiento.');
        }
        setIsVerifying(false);
      }
    };

    if (isFirebaseReady) {
      verifyCode();
    }
  }, [isFirebaseReady, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Por favor, ingresa una nueva contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!actionCode) {
      setError('Código de restablecimiento no válido.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await confirmPasswordReset(auth as Auth, actionCode, password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?passwordReset=success');
      }, 3000);
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error);
      
      switch (error.code) {
        case 'auth/expired-action-code':
          setError('El enlace de restablecimiento ha expirado. Por favor, solicita uno nuevo.');
          break;
        case 'auth/invalid-action-code':
          setError('El enlace de restablecimiento no es válido. Por favor, solicita uno nuevo.');
          break;
        case 'auth/weak-password':
          setError('La contraseña es demasiado débil. Por favor, elige una contraseña más segura.');
          break;
        default:
          setError('Error al restablecer la contraseña. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirebaseReady || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (error && !actionCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 p-4 mb-4">
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
            </div>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Solicitar nuevo enlace de restablecimiento
              </Link>
            </div>
          </div>
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
          Restablecer Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa tu nueva contraseña
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
                      Contraseña restablecida exitosamente
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Tu contraseña ha sido restablecida correctamente.</p>
                      <p className="mt-2">Redirigiendo al inicio de sesión...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nueva Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 input-field"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 input-field"
                  placeholder="Repite tu contraseña"
                  minLength={6}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
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
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 px-4 text-base font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

