'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import { useI18n } from '@/hooks/useI18n';

interface ExpiredCase {
  id: string;
  clientName: string;
  caseTitle: string;
  caseType: string;
  deadline: string;
  daysOverdue: number;
  priority: 'overdue' | 'critical' | 'urgent';
  status: string;
  assignedLawyer: string;
  description: string;
  consequences: string;
  actionRequired: string;
}

export default function ExpiredCasesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [expiredCases, setExpiredCases] = useState<ExpiredCase[]>([]);
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
    const fetchExpiredCases = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for expired cases
        setExpiredCases([
          {
            id: 'EX001',
            clientName: 'José Antonio López',
            caseTitle: 'Acción de Tutela - Derecho a la Educación',
            caseType: 'Acción de Tutela',
            deadline: '2023-12-15',
            daysOverdue: 31,
            priority: 'critical',
            status: 'Vencido',
            assignedLawyer: 'Dr. Carlos Mendoza',
            description: 'Tutela por negación de matrícula estudiantil',
            consequences: 'Pérdida del derecho a educación del menor',
            actionRequired: 'Solicitar prórroga o presentar recurso de reposición'
          },
          {
            id: 'EX002',
            clientName: 'Empresa Beta S.A.S.',
            caseTitle: 'Contrato de Suministro',
            caseType: 'Derecho Comercial',
            deadline: '2023-12-20',
            daysOverdue: 26,
            priority: 'urgent',
            status: 'Vencido',
            assignedLawyer: 'Dra. Ana Rodríguez',
            description: 'Disputa contractual por incumplimiento de suministro',
            consequences: 'Posible pérdida de la demanda por prescripción',
            actionRequired: 'Evaluar posibilidad de prórroga o acuerdo extrajudicial'
          },
          {
            id: 'EX003',
            clientName: 'María del Carmen Ruiz',
            caseTitle: 'Pensión Alimentaria',
            caseType: 'Derecho Familiar',
            deadline: '2023-12-25',
            daysOverdue: 21,
            priority: 'overdue',
            status: 'Vencido',
            assignedLawyer: 'Dr. Luis Martínez',
            description: 'Demanda de pensión alimentaria para menores',
            consequences: 'Retraso en el cobro de pensiones atrasadas',
            actionRequired: 'Presentar recurso de reposición o apelación'
          },
          {
            id: 'EX004',
            clientName: 'Roberto Silva',
            caseTitle: 'Accidente Laboral',
            caseType: 'Derecho Laboral',
            deadline: '2023-12-30',
            daysOverdue: 16,
            priority: 'overdue',
            status: 'Vencido',
            assignedLawyer: 'Dra. Carmen Silva',
            description: 'Reclamo por accidente de trabajo',
            consequences: 'Posible pérdida de beneficios laborales',
            actionRequired: 'Solicitar prórroga por fuerza mayor'
          },
          {
            id: 'EX005',
            clientName: 'Familia González',
            caseTitle: 'Sucesión Intestada',
            caseType: 'Derecho Civil',
            deadline: '2024-01-05',
            daysOverdue: 10,
            priority: 'urgent',
            status: 'Vencido',
            assignedLawyer: 'Dr. Miguel Torres',
            description: 'Proceso de sucesión sin testamento',
            consequences: 'Retraso en la adjudicación de bienes',
            actionRequired: 'Presentar recurso de reposición inmediatamente'
          }
        ]);
      } catch (error) {
        console.error('Error fetching expired cases:', error);
      } finally {
        setCasesLoading(false);
      }
    };

    if (user) {
      fetchExpiredCases();
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
      case 'overdue':
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
      case 'overdue':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
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
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-orange-800">
                {t('dashboard.overdueCases.title')}
              </h1>
              <p className="text-sm text-orange-700">
                {t('dashboard.overdueCases.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
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
              <div className="text-2xl font-bold text-orange-600">
                {expiredCases.length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.overdueCases.totalOverdue')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-red-600">
                {expiredCases.filter(c => c.priority === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.overdueCases.critical')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-orange-600">
                {expiredCases.filter(c => c.priority === 'urgent').length}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.overdueCases.urgent')}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(expiredCases.reduce((acc, c) => acc + c.daysOverdue, 0) / expiredCases.length)}
              </div>
              <div className="text-sm text-gray-600">{t('dashboard.overdueCases.averageDays')}</div>
            </div>
          </div>

          {/* Cases List */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de Casos Vencidos
              </h2>
            </div>
            
            {casesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando casos vencidos...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {expiredCases.map((caseItem) => (
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
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
                        
                        <div className="mb-3 text-sm text-gray-600">
                          <span className="font-medium">Descripción:</span> {caseItem.description}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <span className="font-medium text-red-800">Consecuencias:</span>
                            <p className="text-red-700 mt-1">{caseItem.consequences}</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <span className="font-medium text-orange-800">Acción Requerida:</span>
                            <p className="text-orange-700 mt-1">{caseItem.actionRequired}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {caseItem.daysOverdue}
                        </div>
                        <div className="text-sm text-gray-500">
                          {caseItem.daysOverdue === 1 ? 'día vencido' : 'días vencidos'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Vencía: {new Date(caseItem.deadline).toLocaleDateString()}
                        </div>
                        <button className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
                          Acción Inmediata
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
