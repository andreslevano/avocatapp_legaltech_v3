'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  caseType: string;
  status: 'active' | 'inactive' | 'pending';
  totalCases: number;
  activeCases: number;
  lastContact: string;
  assignedLawyer: string;
  notes: string;
}

export default function CustomerDirectoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
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
    const fetchClients = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for clients in Spain
        setClients([
          {
            id: 'CL001',
            name: 'María González',
            email: 'maria.gonzalez@email.com',
            phone: '+34 600 123 456',
            city: 'Madrid',
            caseType: 'Derecho Civil',
            status: 'active',
            totalCases: 3,
            activeCases: 2,
            lastContact: '2024-01-10',
            assignedLawyer: 'Dr. Carlos Mendoza',
            notes: 'Cliente preferencial, muy satisfecha con el servicio'
          },
          {
            id: 'CL002',
            name: 'Empresa ABC S.L.',
            email: 'contacto@empresaabc.com',
            phone: '+34 91 234 5678',
            city: 'Barcelona',
            caseType: 'Derecho Mercantil',
            status: 'active',
            totalCases: 5,
            activeCases: 3,
            lastContact: '2024-01-08',
            assignedLawyer: 'Dra. Ana Rodríguez',
            notes: 'Empresa con múltiples casos, requiere seguimiento constante'
          },
          {
            id: 'CL003',
            name: 'Juan Pérez',
            email: 'juan.perez@email.com',
            phone: '+34 610 987 654',
            city: 'Valencia',
            caseType: 'Derecho Laboral',
            status: 'active',
            totalCases: 2,
            activeCases: 1,
            lastContact: '2024-01-12',
            assignedLawyer: 'Dr. Luis Martínez',
            notes: 'Caso de despido improcedente en proceso'
          },
          {
            id: 'CL004',
            name: 'Familia Rodríguez',
            email: 'familia.rodriguez@email.com',
            phone: '+34 615 456 789',
            city: 'Sevilla',
            caseType: 'Derecho Civil',
            status: 'active',
            totalCases: 1,
            activeCases: 1,
            lastContact: '2024-01-09',
            assignedLawyer: 'Dra. Carmen Silva',
            notes: 'Proceso de sucesión, documentos en revisión'
          },
          {
            id: 'CL005',
            name: 'Roberto Jiménez',
            email: 'roberto.jimenez@email.com',
            phone: '+34 620 111 222',
            city: 'Madrid',
            caseType: 'Derecho Civil',
            status: 'pending',
            totalCases: 1,
            activeCases: 0,
            lastContact: '2024-01-05',
            assignedLawyer: 'Dr. Miguel Torres',
            notes: 'Consulta inicial, pendiente de formalización'
          },
          {
            id: 'CL006',
            name: 'Ana Sofía Torres',
            email: 'ana.torres@email.com',
            phone: '+34 600 555 777',
            city: 'Barcelona',
            caseType: 'Derecho de Familia',
            status: 'inactive',
            totalCases: 2,
            activeCases: 0,
            lastContact: '2023-12-15',
            assignedLawyer: 'Dra. Patricia López',
            notes: 'Caso cerrado exitosamente, cliente satisfecho'
          },
          {
            id: 'CL007',
            name: 'Carlos Mendoza',
            email: 'carlos.mendoza@email.com',
            phone: '+34 610 333 444',
            city: 'Valencia',
            caseType: 'Derecho Penal',
            status: 'active',
            totalCases: 1,
            activeCases: 1,
            lastContact: '2024-01-11',
            assignedLawyer: 'Dr. Fernando Castro',
            notes: 'Caso penal en investigación, requiere seguimiento'
          },
          {
            id: 'CL008',
            name: 'Grupo Empresarial Delta',
            email: 'legal@grupodelta.com',
            phone: '+34 91 555 9999',
            city: 'Madrid',
            caseType: 'Derecho Mercantil',
            status: 'active',
            totalCases: 4,
            activeCases: 2,
            lastContact: '2024-01-13',
            assignedLawyer: 'Dr. Alejandro Ramírez',
            notes: 'Cliente corporativo importante, múltiples contratos'
          }
        ]);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setClientsLoading(false);
      }
    };

    if (user) {
      fetchClients();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-surface-muted/30 text-text-primary border-border';
      case 'inactive':
        return 'bg-surface-muted/20 text-text-secondary border-border';
      case 'pending':
        return 'bg-surface-muted/40 text-text-primary border-border';
      default:
        return 'bg-surface-muted/30 text-text-primary border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'inactive':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Filter clients based on search term and filters
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    const matchesCity = filterCity === 'all' || client.city === filterCity;
    
    return matchesSearch && matchesStatus && matchesCity;
  });

  const uniqueCities = [...new Set(clients.map(client => client.city))];

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      {/* Floating Volver button - top right */}
      <Link
        href="/dashboard/casos"
        className="fixed top-24 right-8 z-50 group w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors"
        title="Volver"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Volver
        </span>
      </Link>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-h1 text-text-primary mb-2">{t('dashboard.clientDirectory.title')}</h1>
          <p className="text-body text-text-secondary mb-6">{t('dashboard.clientDirectory.subtitle')}</p>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <div className="text-2xl font-bold text-text-primary">
                {clients.length}
              </div>
              <div className="text-sm text-text-secondary">{t('dashboard.clientDirectory.totalClients')}</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <div className="text-2xl font-bold text-text-primary">
                {clients.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm text-text-secondary">{t('dashboard.clientDirectory.active')}</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <div className="text-2xl font-bold text-text-primary">
                {clients.filter(c => c.status === 'pending').length}
              </div>
              <div className="text-sm text-text-secondary">{t('dashboard.clientDirectory.pending')}</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <div className="text-2xl font-bold text-text-primary">
                {clients.reduce((acc, c) => acc + c.totalCases, 0)}
              </div>
              <div className="text-sm text-text-secondary">{t('dashboard.clientDirectory.totalCases')}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('dashboard.clientDirectory.searchClient')}
                </label>
                <input
                  type="text"
                  placeholder={t('dashboard.clientDirectory.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('dashboard.clientDirectory.status')}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                >
                  <option value="all">{t('dashboard.clientDirectory.allStatuses')}</option>
                  <option value="active">{t('dashboard.clientDirectory.active')}</option>
                  <option value="pending">{t('dashboard.clientDirectory.pending')}</option>
                  <option value="inactive">{t('dashboard.clientDirectory.inactive')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('dashboard.clientDirectory.city')}
                </label>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                >
                  <option value="all">{t('dashboard.clientDirectory.allCities')}</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Clients List - similar to case item list, expanded by default with counter */}
          <div className="bg-card shadow-sm rounded-lg border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Lista de Clientes
              </h2>
              <span className="text-2xl font-bold text-text-primary">
                {clientsLoading ? '—' : filteredClients.length}
              </span>
            </div>
            
            {clientsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sidebar mx-auto"></div>
                <p className="mt-4 text-text-secondary">Cargando clientes...</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: '600px' }}>
                {filteredClients.map((client) => (
                  <div key={client.id} className="p-6 hover:bg-app transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg font-medium text-text-primary">
                            {client.name}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                            {getStatusIcon(client.status)}
                            <span className="ml-1 capitalize">{client.status}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-text-secondary mb-3">
                          <div>
                            <span className="font-medium">Email:</span> {client.email}
                          </div>
                          <div>
                            <span className="font-medium">Teléfono:</span> {client.phone}
                          </div>
                          <div>
                            <span className="font-medium">Ciudad:</span> {client.city}
                          </div>
                          <div>
                            <span className="font-medium">Abogado:</span> {client.assignedLawyer}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-text-secondary mb-3">
                          <div>
                            <span className="font-medium">Tipo de Caso:</span> {client.caseType}
                          </div>
                          <div>
                            <span className="font-medium">Total Casos:</span> {client.totalCases}
                          </div>
                          <div>
                            <span className="font-medium">Casos Activos:</span> {client.activeCases}
                          </div>
                        </div>
                        
                        <div className="text-sm text-text-secondary mb-3">
                          <span className="font-medium">Último Contacto:</span> {new Date(client.lastContact).toLocaleDateString()}
                        </div>
                        
                        {client.notes && (
                          <div className="text-sm text-text-secondary">
                            <span className="font-medium">Notas:</span> {client.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        <button className="bg-sidebar text-text-on-dark px-4 py-2 rounded-lg text-sm hover:bg-text-primary transition-colors">
                          Ver Perfil
                        </button>
                        <button className="bg-sidebar text-text-on-dark px-4 py-2 rounded-lg text-sm hover:bg-text-primary transition-colors">
                          Contactar
                        </button>
                        <button className="bg-sidebar text-text-on-dark px-4 py-2 rounded-lg text-sm hover:bg-text-primary transition-colors">
                          Ver Casos
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
