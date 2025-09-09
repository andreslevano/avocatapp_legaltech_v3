'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import TutelaProcessSimple from '@/components/TutelaProcessSimple';
import PurchaseHistoryComponent from '@/components/PurchaseHistory';
import UserMenu from '@/components/UserMenu';

export default function AccionTutelaDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [formData, setFormData] = useState({
    vulnerador: '',
    hechos: '',
    derecho: '',
    solicitud: ''
  });
  const router = useRouter();

  useEffect(() => {
    // Check if Firebase is properly initialized
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

  const handleSignOut = async () => {
    if (!isFirebaseReady || !auth || typeof auth.signOut !== 'function') {
      return;
    }

    try {
      await signOut(auth as Auth);
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.vulnerador || !formData.hechos || !formData.derecho || !formData.solicitud) {
      alert('Por favor, complete todos los campos del formulario.');
      return;
    }
    
    // Show the process
    setShowProcess(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProcessComplete = (document: any) => {
    console.log('Tutela process completed:', document);
    // You can add additional logic here, like saving to database, etc.
  };

  const handleResetForm = () => {
    setFormData({
      vulnerador: '',
      hechos: '',
      derecho: '',
      solicitud: ''
    });
    setShowProcess(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
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
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat - Acción de Tutela</span>
            </div>
            
            <UserMenu user={user} currentPlan="Acción de Tutela" />
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Acción de Tutela" />

      {/* Dashboard Identification Banner */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <strong>Dashboard de Acción de Tutela</strong> - Gestión especializada para acciones de tutela en Colombia
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Panel de Acción de Tutela
          </h1>

          {/* Welcome Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                ¡Bienvenido a Avocat para Acciones de Tutela!
              </h3>
              <p className="text-sm text-gray-600">
                Gestiona tus acciones de tutela de manera eficiente con herramientas especializadas en derecho constitucional colombiano.
              </p>
            </div>
          </div>


          {/* Formulario de Acción de Tutela */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Formulario de Acción de Tutela
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Campo 1: Nombre de persona o entidad que vulnera el derecho */}
                <div>
                  <label htmlFor="vulnerador" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de persona o entidad que vulnera el derecho
                  </label>
                  <input
                    type="text"
                    id="vulnerador"
                    name="vulnerador"
                    value={formData.vulnerador}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Ingrese el nombre de la persona o entidad"
                    required
                  />
                </div>

                {/* Campo 2: Relato de los hechos */}
                <div>
                  <label htmlFor="hechos" className="block text-sm font-medium text-gray-700 mb-2">
                    Relato de los hechos
                  </label>
                  <textarea
                    id="hechos"
                    name="hechos"
                    value={formData.hechos}
                    onChange={handleFormChange}
                    rows={6}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Describa detalladamente los hechos que dieron lugar a la vulneración de sus derechos fundamentales"
                    required
                  />
                </div>

                {/* Campo 3: Que derecho piensa que ha sido vulnerado */}
                <div>
                  <label htmlFor="derecho" className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Qué derecho piensa que ha sido vulnerado?
                  </label>
                  <select
                    id="derecho"
                    name="derecho"
                    value={formData.derecho}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    required
                  >
                    <option value="">Seleccione un derecho</option>
                    <option value="vida">Derecho a la vida</option>
                    <option value="salud">Derecho a la salud</option>
                    <option value="educacion">Derecho a la educación</option>
                    <option value="igualdad">Derecho a la igualdad</option>
                    <option value="debido-proceso">Derecho al debido proceso</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                {/* Campo 4: Que se solicita */}
                <div>
                  <label htmlFor="solicitud" className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Qué se solicita?
                  </label>
                  <textarea
                    id="solicitud"
                    name="solicitud"
                    value={formData.solicitud}
                    onChange={handleFormChange}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Describa específicamente qué solicita al juez de tutela para la protección de sus derechos"
                    required
                  />
                </div>

                {/* Botón Continuar */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Continuar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Proceso de Acción de Tutela */}
          {showProcess && (
            <div className="mb-8">
              <TutelaProcessSimple 
                formData={formData} 
                onComplete={handleProcessComplete}
                onResetForm={handleResetForm}
              />
            </div>
          )}

          {/* Purchase History Section */}
          <div className="mt-12">
            <PurchaseHistoryComponent userId={user?.uid} documentType="accion_tutela" />
          </div>
        </div>
      </main>
    </div>
  );
}
