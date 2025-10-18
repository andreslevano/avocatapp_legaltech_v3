'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import { handleUserReactivation } from '@/lib/user-reactivation';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reactivationMessage, setReactivationMessage] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSuccessfulLogin = async (user: any) => {
    try {
      // Check if user needs reactivation
      const reactivationResult = await handleUserReactivation(user);
      
      if (reactivationResult.wasReactivated) {
        setReactivationMessage(reactivationResult.message || 'Tu cuenta ha sido reactivada.');
        // Show message for 3 seconds before redirecting
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        // Normal login flow
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error during login process:', error);
      router.push('/dashboard'); // Continue to dashboard even if reactivation check fails
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseReady) {
      setError('Firebase no está listo. Intenta recargar la página.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth as Auth, formData.email, formData.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este email');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/invalid-email':
          setError('Email inválido');
          break;
        default:
          setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseReady) {
      setError('Firebase no está listo. Intenta recargar la página.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth as Auth, provider);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      console.error('Error al iniciar sesión con Google:', error);
      setError('Error al iniciar sesión con Google. Intenta de nuevo.');
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
          {t('auth.login.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Google Login Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.login.continueWithGoogle')}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('auth.login.orEmail')}</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Tu contraseña"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {reactivationMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm text-green-700">{reactivationMessage}</div>
                    <div className="text-xs text-green-600 mt-1">Redirigiendo al dashboard...</div>
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
                {isLoading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
              </button>
            </div>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('auth.login.noAccount')}{' '}
                <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                  {t('auth.login.signupLink')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
