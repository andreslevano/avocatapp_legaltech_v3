'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';

interface OnTimeCase {
  id: string;
  clientName: string;
  caseTitle: string;
  caseType: string;
  deadline: string;
  daysRemaining: number;
  priority: 'low' | 'medium' | 'normal';
  status: string;
  assignedLawyer: string;
  description: string;
  progress: number;
}

export default function OnTimeCasesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [onTimeCases, setOnTimeCases] = useState<OnTimeCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
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

  useEffect(() => {
    const fetchOnTimeCases = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for on-time cases
        setOnTimeCases([
          {
            id: 'OT001',
            clientName: 'Empresa XYZ Ltda.',
            caseTitle: 'Contrato de Arrendamiento Comercial',
            caseType: 'Derecho Comercial',
            deadline: '2024-02-15',
            daysRemaining: 30,
            priority: 'medium',
            status: 'En Proceso',
            assignedLawyer: 'Dra. Laura García',
            description: 'Renovación de contrato de arrendamiento comercial',
            progress: 65
          },
          {
            id: 'OT002',
            clientName: 'María Elena Ruiz',
            caseTitle: 'Divorcio por Mutuo Acuerdo',
            caseType: 'Derecho Familiar',
            deadline: '2024-02-20',
            daysRemaining: 35,
            priority: 'normal',
            status: 'Documentación',
            assignedLawyer: 'Dr. Roberto Silva',
            description: 'Proceso de divorcio consensual',
            progress: 40
          },
          {
            id: 'OT003',
            clientName: 'Constructora ABC S.A.S.',
            caseTitle: 'Permisos de Construcción',
            caseType: 'Derecho Administrativo',
            deadline: '2024-02-25',
            daysRemaining: 40,
            priority: 'low',
            status: 'Revisión',
            assignedLawyer: 'Dra. Patricia López',
            description: 'Tramitación de permisos de construcción',
            progress: 80
          },
          {
            id: 'OT004',
            clientName: 'Carlos Mendoza',
            caseTitle: 'Herencia y Sucesión',
            caseType: 'Derecho Civil',
            deadline: '2024-03-01',
            daysRemaining: 45,
            priority: 'medium',
            status: 'En Proceso',
            assignedLawyer: 'Dr. Fernando Castro',
            description: 'Proceso de sucesión testamentaria',
            progress: 55
          },
          {
            id: 'OT005',
            clientName: 'Ana Sofía Torres',
            caseTitle: 'Contrato de Prestación de Servicios',
            caseType: 'Derecho Civil',
            deadline: '2024-03-05',
            daysRemaining: 49,
            priority: 'normal',
            status: 'Negociación',
            assignedLawyer: 'Dra. Carmen Vega',
            description: 'Contrato de servicios profesionales',
            progress: 30
          },
          {
            id: 'OT006',
            clientName: 'Grupo Empresarial Delta',
            caseTitle: 'Fusión Empresarial',
            caseType: 'Derecho Comercial',
            deadline: '2024-03-10',
            daysRemaining: 54,
            priority: 'medium',
            status: 'Análisis',
            assignedLawyer: 'Dr. Alejandro Ramírez',
            description: 'Proceso de fusión entre empresas',
            progress: 25
          }
        ]);
      } catch (error) {
        console.error('Error fetching on-time cases:', error);
      } finally {
        setCasesLoading(false);
      }
    };

    if (user) {
      fetchOnTimeCases();
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
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En Proceso':
        return 'bg-blue-100 text-blue-800';
      case 'Documentación':
        return 'bg-yellow-100 text-yellow-800';
      case 'Revisión':
        return 'bg-purple-100 text-purple-800';
      case 'Negociación':
        return 'bg-orange-100 text-orange-800';
      case 'Análisis':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                Bienvenido, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Abogados" />

      {/* Page Header */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-green-800">
                Casos a Tiempo
              </h1>
              <p className="text-sm text-green-700">
                Casos con plazo normal de resolución
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-green-600">
                {onTimeCases.length}
              </div>
              <div className="text-sm text-gray-600">Total a Tiempo</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {onTimeCases.filter(c => c.priority === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Prioridad Media</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">
                {onTimeCases.filter(c => c.priority === 'normal').length}
              </div>
              <div className="text-sm text-gray-600">Prioridad Normal</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(onTimeCases.reduce((acc, c) => acc + c.progress, 0) / onTimeCases.length)}%
              </div>
              <div className="text-sm text-gray-600">Progreso Promedio</div>
            </div>
          </div>

          {/* Cases List */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de Casos a Tiempo
              </h2>
            </div>
            
            {casesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando casos a tiempo...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {onTimeCases.map((caseItem) => (
                  <div key={caseItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {caseItem.caseTitle}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(caseItem.priority)}`}>
                            <span className="capitalize">{caseItem.priority}</span>
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                            {caseItem.status}
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
                            <span className="font-medium">Progreso:</span> {caseItem.progress}%
                          </div>
                        </div>
                        
                        <div className="mb-3 text-sm text-gray-600">
                          <span className="font-medium">Descripción:</span> {caseItem.description}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${caseItem.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {caseItem.daysRemaining}
                        </div>
                        <div className="text-sm text-gray-500">
                          {caseItem.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Vence: {new Date(caseItem.deadline).toLocaleDateString()}
                        </div>
                        <button className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors">
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
