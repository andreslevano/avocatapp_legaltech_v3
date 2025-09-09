'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';

export default function Subscription() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
        if (user) {
          setUser(user);
        } else {
          router.push('/login');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
      router.push('/login');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat LegalTech</span>
            </Link>

            <UserMenu user={user} currentPlan="Abogados" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Suscripción</h1>
            <p className="mt-2 text-gray-600">Gestiona tu plan de suscripción y facturación</p>
          </div>

          {/* Current Plan Card */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Plan Actual</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">👨‍💼</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Plan Abogados</h3>
                    <p className="text-gray-600">Acceso completo a todas las funcionalidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">€29.99</p>
                  <p className="text-sm text-gray-500">por mes</p>
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Actualizar Plan
                </button>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  Cancelar Suscripción
                </button>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Planes Disponibles</h2>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Estudiantes Plan */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">🎓</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Estudiantes</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">€9.99</p>
                    <p className="text-sm text-gray-500">por mes</p>
                    <ul className="mt-4 text-sm text-gray-600 space-y-2">
                      <li>• Documentos básicos</li>
                      <li>• Plantillas legales</li>
                      <li>• Soporte por email</li>
                    </ul>
                    <button className="w-full mt-4 px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                      Cambiar Plan
                    </button>
                  </div>
                </div>

                {/* Reclamación Plan */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Reclamación</h3>
                    <p className="text-2xl font-bold text-orange-600 mt-2">€19.99</p>
                    <p className="text-sm text-gray-500">por mes</p>
                    <ul className="mt-4 text-sm text-gray-600 space-y-2">
                      <li>• Herramientas de reclamación</li>
                      <li>• Cálculo automático</li>
                      <li>• Plantillas especializadas</li>
                    </ul>
                    <button className="w-full mt-4 px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                      Cambiar Plan
                    </button>
                  </div>
                </div>

                {/* Acción de Tutela Plan */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-red-300 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">⚖️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Acción de Tutela</h3>
                    <p className="text-2xl font-bold text-red-600 mt-2">€24.99</p>
                    <p className="text-sm text-gray-500">por mes</p>
                    <ul className="mt-4 text-sm text-gray-600 space-y-2">
                      <li>• Gestión de tutelas</li>
                      <li>• Formularios automáticos</li>
                      <li>• Seguimiento de casos</li>
                    </ul>
                    <button className="w-full mt-4 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                      Cambiar Plan
                    </button>
                  </div>
                </div>

                {/* Abogados Plan (Current) */}
                <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">👨‍💼</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Abogados</h3>
                    <p className="text-2xl font-bold text-blue-600 mt-2">€29.99</p>
                    <p className="text-sm text-gray-500">por mes</p>
                    <ul className="mt-4 text-sm text-gray-600 space-y-2">
                      <li>• Acceso completo</li>
                      <li>• Todas las funcionalidades</li>
                      <li>• Soporte prioritario</li>
                    </ul>
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md cursor-not-allowed opacity-50">
                      Plan Actual
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Información de Facturación</h2>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Método de Pago</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-blue-600 font-bold">💳</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">•••• •••• •••• 1234</p>
                      <p className="text-sm text-gray-500">Expira 12/25</p>
                    </div>
                  </div>
                  <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Actualizar método de pago
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Próxima Facturación</h3>
                  <p className="text-gray-600">€29.99 se cobrará el 15 de enero de 2024</p>
                  <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Ver historial de facturación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}