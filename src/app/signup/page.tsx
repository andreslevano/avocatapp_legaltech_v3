'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, Auth, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import AccountReactivationModal from '@/components/AccountReactivationModal';
import { checkUserStatus, reactivateUserAccount } from '@/lib/user-reactivation';

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    firm: '',
    phone: '',
    country: '',
    plan: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [reactivationUser, setReactivationUser] = useState<{uid: string, email: string} | null>(null);
  const router = useRouter();
  const { t } = useI18n();

  // Function to get dashboard URL based on selected plan
  const getDashboardUrl = (plan: string): string => {
    switch (plan) {
      case 'Estudiantes':
        return '/dashboard/estudiantes';
      case 'Reclamación de Cantidades':
        return '/dashboard/reclamacion-cantidades';
      case 'Acción de Tutela':
        return '/dashboard/accion-tutela';
      case 'Abogados':
      default:
        return '/dashboard';
    }
  };

  // Handle account reactivation
  const handleReactivation = async () => {
    if (!reactivationUser) return;

    setIsLoading(true);
    try {
      const result = await reactivateUserAccount(reactivationUser.uid);
      
      if (result.success) {
        // Sign in the user after reactivation
        await signInWithEmailAndPassword(auth as Auth, reactivationUser.email, formData.password);
        
        setSuccess('¡Cuenta reactivada exitosamente! Redirigiendo...');
        setShowReactivationModal(false);
        setReactivationUser(null);
        
        // Navigate to dashboard
        const dashboardUrl = getDashboardUrl(formData.plan);
        setTimeout(() => {
          router.push(dashboardUrl);
        }, 2000);
      } else {
        setError(result.message || 'Error al reactivar la cuenta');
      }
    } catch (error: any) {
      console.error('Error during reactivation:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta. Por favor, verifica tu contraseña.');
      } else {
        setError('Error al reactivar la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (auth && 'app' in auth) {
      setIsFirebaseReady(true);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If country changes, reset plan selection
    if (name === 'country') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        plan: '', // Reset plan when country changes
        firm: '' // Reset firm when country changes
      }));
    } else if (name === 'plan') {
      // If plan changes, reset firm if not Abogados
      setFormData(prev => ({
        ...prev,
        [name]: value,
        firm: value === 'Abogados' ? prev.firm : '' // Clear firm if not Abogados plan
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
      await createUserWithEmailAndPassword(
        auth as Auth,
        formData.email,
        formData.password
      );

      // Skip Firestore for now to ensure navigation works
      console.log('Account created successfully, skipping Firestore for now');
      console.log('Selected plan:', formData.plan);
      
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      
      // Redirigir directamente al dashboard seleccionado
      const dashboardUrl = getDashboardUrl(formData.plan);
      console.log('Attempting to navigate to dashboard:', dashboardUrl);
      console.log('Form data:', formData);
      try {
        await router.push(dashboardUrl);
        console.log('Navigation successful');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Fallback: try window.location
        window.location.href = dashboardUrl;
      }

    } catch (error: unknown) {
      console.error('Error al crear cuenta:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        switch ((error as { code: string }).code) {
        case 'auth/email-already-in-use':
          // Check if the user exists and is inactive
          const userStatus = await checkUserStatus(formData.email);
          if (userStatus.exists && !userStatus.isActive) {
            // Show reactivation modal for inactive users
            setReactivationUser({
              uid: userStatus.uid!,
              email: formData.email
            });
            setShowReactivationModal(true);
          } else {
            setError('Este email ya está registrado y activo');
          }
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
      }
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
          {t('auth.signup.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth.signup.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

          <form className="space-y-6" onSubmit={handleEmailSignUp}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('auth.signup.firstName')}
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
                  {t('auth.signup.lastName')}
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
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                País *
              </label>
              <select
                id="country"
                name="country"
                required
                value={formData.country}
                onChange={handleInputChange}
                className="mt-1 input-field"
              >
                <option value="">Selecciona tu país</option>
                <option value="Chile">Chile</option>
                <option value="Colombia">Colombia</option>
                <option value="Ecuador">Ecuador</option>
                <option value="España">España</option>
                <option value="Mexico">Mexico</option>
                <option value="Peru">Peru</option>
              </select>
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                Plan *
              </label>
              <select
                id="plan"
                name="plan"
                required
                value={formData.plan}
                onChange={handleInputChange}
                className="mt-1 input-field"
                disabled={!formData.country}
              >
                <option value="">
                  {!formData.country ? 'Primero selecciona un país' : 'Selecciona tu plan'}
                </option>
                {formData.country === 'España' && (
                  <>
                    <option value="Estudiantes">Estudiantes</option>
                    <option value="Reclamación de Cantidades">Reclamación de Cantidades</option>
                    <option value="Abogados">Abogados</option>
                  </>
                )}
                {formData.country === 'Colombia' && (
                  <>
                    <option value="Acción de Tutela">Acción de Tutela</option>
                    <option value="Abogados">Abogados</option>
                  </>
                )}
                {formData.country && formData.country !== 'España' && formData.country !== 'Colombia' && (
                  <option value="Abogados">Abogados</option>
                )}
              </select>
            </div>

            {formData.plan === 'Abogados' && (
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
            )}

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

      {/* Account Reactivation Modal */}
      {showReactivationModal && reactivationUser && (
        <AccountReactivationModal
          isOpen={showReactivationModal}
          onClose={() => {
            setShowReactivationModal(false);
            setReactivationUser(null);
          }}
          onConfirm={handleReactivation}
          userEmail={reactivationUser.email}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
