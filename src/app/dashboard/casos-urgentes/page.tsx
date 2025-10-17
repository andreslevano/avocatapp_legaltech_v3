'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import { useI18n } from '@/hooks/useI18n';

interface UrgentCase {
  id: string;
  clientName: string;
  caseTitle: string;
  caseType: string;
  deadline: string;
  daysRemaining: number;
  priority: 'high' | 'urgent' | 'critical';
  status: string;
  assignedLawyer: string;
  description: string;
}

export default function UrgentCasesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [urgentCases, setUrgentCases] = useState<UrgentCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const router = useRouter();
  const { t } = useI18n();

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

  useEffect(() => {
    const fetchUrgentCases = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for urgent cases in Spain
        setUrgentCases([
          {
            id: 'UC001',
            clientName: 'María González',
            caseTitle: 'Procedimiento de Protección de Datos',
            caseType: 'Derecho Administrativo',
            deadline: '2024-01-15',
            daysRemaining: 2,
            priority: 'critical',
            status: 'En Proceso',
            assignedLawyer: 'Dr. Carlos Mendoza',
            description: 'Caso de protección de datos personales ante la AEPD'
          },
          {
            id: 'UC002',
            clientName: 'Empresa ABC S.L.',
            caseTitle: 'Contrato de Prestación de Servicios',
            caseType: 'Derecho Mercantil',
            deadline: '2024-01-16',
            daysRemaining: 3,
            priority: 'urgent',
            status: 'Revisión',
            assignedLawyer: 'Dra. Ana Rodríguez',
            description: 'Disputa contractual con proveedor de servicios'
          },
          {
            id: 'UC003',
            clientName: 'Juan Pérez',
            caseTitle: 'Despido Improcedente',
            caseType: 'Derecho Laboral',
            deadline: '2024-01-17',
            daysRemaining: 4,
            priority: 'high',
            status: 'Documentación',
            assignedLawyer: 'Dr. Luis Martínez',
            description: 'Reclamación por despido sin justa causa'
          },
          {
            id: 'UC004',
            clientName: 'Familia Rodríguez',
            caseTitle: 'Sucesión Intestada',
            caseType: 'Derecho Civil',
            deadline: '2024-01-18',
            daysRemaining: 5,
            priority: 'high',
            status: 'En Proceso',
            assignedLawyer: 'Dra. Carmen Silva',
            description: 'Proceso de sucesión sin testamento'
          },
          {
            id: 'UC005',
            clientName: 'Roberto Jiménez',
            caseTitle: 'Accidente de Tráfico',
            caseType: 'Derecho Civil',
            deadline: '2024-01-19',
            daysRemaining: 5,
            priority: 'urgent',
            status: 'Investigación',
            assignedLawyer: 'Dr. Miguel Torres',
            description: 'Reclamación por daños y perjuicios en accidente de tráfico'
          }
        ]);
      } catch (error) {
        console.error('Error fetching urgent cases:', error);
      } finally {
        setCasesLoading(false);
      }
    };

    if (user) {
      fetchUrgentCases();
    }
  }, [user]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'urgent':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'high':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
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
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {t('dashboard.welcome')}, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
              >
                {t('navigation.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Abogados" />

      {/* Page Header */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-red-800">
                {t('dashboard.urgentCases.title')}
              </h1>
              <p className="text-sm text-red-700">
                {t('dashboard.urgentCases.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            ← {t('dashboard.backToDashboard')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-red-600">
                {urgentCases.length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.urgentCases.totalUrgent')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-orange-600">
                {urgentCases.filter(c => c.priority === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.urgentCases.critical')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-yellow-600">
                {urgentCases.filter(c => c.priority === 'urgent').length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.urgentCases.urgent')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {urgentCases.filter(c => c.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.urgentCases.highPriority')}</div>
            </div>
          </div>

          {/* Cases List */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.urgentCases.casesList')}
              </h2>
            </div>
            
            {casesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('dashboard.urgentCases.loading')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {urgentCases.map((caseItem) => (
                  <div key={caseItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {caseItem.caseTitle}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(caseItem.priority)}`}>
                            {getPriorityIcon(caseItem.priority)}
                            <span className="ml-1 capitalize">{caseItem.priority}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Cliente:</span> {caseItem.clientName}
                          </div>
                          <div>
                            <span className="font-medium">Tipo:</span> {caseItem.caseType}
                          </div>
                          <div>
                            <span className="font-medium">Abogado:</span> {caseItem.assignedLawyer}
                          </div>
                          <div>
                            <span className="font-medium">Estado:</span> {caseItem.status}
                          </div>
                        </div>
                        
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Descripción:</span> {caseItem.description}
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <div className={`text-2xl font-bold ${
                          caseItem.daysRemaining <= 2 ? 'text-red-600' :
                          caseItem.daysRemaining <= 3 ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {caseItem.daysRemaining}
                        </div>
                        <div className="text-sm text-gray-500">
                          {caseItem.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Vence: {new Date(caseItem.deadline).toLocaleDateString()}
                        </div>
                        <button 
                          onClick={() => router.push('/dashboard/analisis-caso')}
                          className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
