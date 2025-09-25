'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavigation from '@/components/DashboardNavigation';
import ReclamacionProcessSimple from '@/components/ReclamacionProcessSimple';
import PurchaseHistoryComponent from '@/components/PurchaseHistory';
import UserMenu from '@/components/UserMenu';

export default function ReclamacionCantidadesDashboard() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Simular carga rápida para demo
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando Reclamación de Cantidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />

      {/* Dashboard Identification Banner */}
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-orange-700">
              <strong>Dashboard de Reclamación de Cantidades</strong> - Herramientas especializadas para reclamaciones monetarias
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Panel de Reclamación de Cantidades
          </h1>

          {/* Welcome Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                ¡Bienvenido a Avocat para Reclamaciones!
              </h3>
              <p className="text-sm text-gray-600">
                Gestiona tus reclamaciones de cantidades de manera eficiente con herramientas especializadas en derecho mercantil y civil.
              </p>
            </div>
          </div>


          {/* Document Processing Workflow */}
          <ReclamacionProcessSimple />

          {/* Purchase History Section */}
          <div className="mt-12">
            <PurchaseHistoryComponent userId="demo_user" documentType="reclamacion_cantidades" />
          </div>
        </div>
      </main>
    </div>
  );
}
