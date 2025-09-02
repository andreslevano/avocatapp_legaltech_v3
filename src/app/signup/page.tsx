'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, Auth } from 'firebase/auth';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    firm: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (auth && 'app' in auth) {
      setIsFirebaseReady(true);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseReady) {
      setError('Firebase no está listo. Intenta recargar la página.');
      return;
    }

    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth as Auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Skip Firestore for now to ensure navigation works
      console.log('Account created successfully, skipping Firestore for now');
      
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      
      // Redirigir al dashboard inmediatamente
      console.log('Attempting to navigate to dashboard...');
      try {
        await router.push('/dashboard');
        console.log('Navigation successful');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Fallback: try window.location
        window.location.href = '/dashboard';
      }

    } catch (error: any) {
      console.error('Error al crear cuenta:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('Este email ya está registrado');
          break;
        case 'auth/invalid-email':
          setError('Email inválido');
          break;
        case 'auth/weak-password':
          setError('La contraseña es demasiado débil');
          break;
        default:
          setError('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isFirebaseReady) {
      setError('Firebase no está listo. Intenta recargar la página.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth as Auth, provider);
      const user = result.user;

      // Skip Firestore for now to ensure navigation works
      console.log('Google account created successfully, skipping Firestore for now');

      setSuccess('¡Cuenta creada exitosamente con Google! Redirigiendo...');
      
      // Redirigir al dashboard inmediatamente
      console.log('Attempting to navigate to dashboard...');
      try {
        await router.push('/dashboard');
        console.log('Navigation successful');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Fallback: try window.location
        window.location.href = '/dashboard';
      }

    } catch (error: any) {
      console.error('Error al crear cuenta con Google:', error);
      setError('Error al crear cuenta con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Configuración Requerida
          </h2>
          <p className="text-gray-600 mb-6">
            Para usar la funcionalidad de registro, necesitas configurar Firebase. 
            Por favor, crea un archivo <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> con tus credenciales de Firebase.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Variables requeridas:</p>
            <ul className="space-y-1 text-gray-700">
              <li>• NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>• NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>• NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
            </ul>
          </div>
          <div className="mt-6">
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Ir a Firebase Console
            </a>
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
          Crear tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Únete a Avocat y revoluciona tu práctica legal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Google Sign Up Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O registrarse con email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleEmailSignUp}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="mt-1 input-field"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Apellido
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="mt-1 input-field"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

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
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="firm" className="block text-sm font-medium text-gray-700">
                Bufete (opcional)
              </label>
              <input
                id="firm"
                name="firm"
                type="text"
                value={formData.firm}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Nombre del bufete"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono (opcional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Mínimo 6 caracteres"
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
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Repite tu contraseña"
              />
            </div>
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 px-4 text-base font-medium disabled:opacity-50"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="/terminos" className="text-primary-600 hover:text-primary-500">
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="text-primary-600 hover:text-primary-500">
                Política de Privacidad
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
