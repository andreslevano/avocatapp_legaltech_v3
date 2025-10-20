'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, Auth } from 'firebase/auth';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
import ErrorBoundary from '@/components/ErrorBoundary';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  stats: {
    totalDocuments: number;
    totalGenerations: number;
    totalSpent: number;
    lastGenerationAt?: string;
  };
  subscription?: {
    plan: string;
    isActive: boolean;
  };
}

interface UserSummary {
  user: User;
  recentGenerations: any[];
  recentPurchases: any[];
  analytics: any;
  summary: {
    totalDocuments: number;
    totalSpent: number;
    lastActivity: string;
    successRate: number;
    averageProcessingTime: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [showEmailFrame, setShowEmailFrame] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    // Add global error handler for runtime errors
    const handleRuntimeError = (event: ErrorEvent) => {
      console.warn('Caught runtime error:', event.error);
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Caught unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Defer any redirect until we have definitively checked auth state
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (u) => {
        try {
          setUser(u);
          setAuthChecked(true);
          setLoading(false);
        } catch (error) {
          console.error('Error in auth state change:', error);
          setLoading(false);
          setAuthChecked(true);
        }
      });
      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth:', error);
        } finally {
          window.removeEventListener('error', handleRuntimeError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        }
      };
    } else {
      setLoading(false);
      setAuthChecked(true);
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }
  }, []);

  useEffect(() => {
    // Only redirect if we've definitely checked auth and confirmed no user
    if (authChecked && isFirebaseReady && !user) {
      const timer = setTimeout(() => {
        if (auth && typeof auth.currentUser === 'function') {
          try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              router.push('/login');
            }
          } catch (error) {
            console.error('Error checking current user:', error);
          }
        } else {
          router.push('/login');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [authChecked, isFirebaseReady, user, router]);

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

  // MOVED FUNCTIONS TO TOP TO FIX REACT HOOKS RULE
  const checkAdminPermissions = async () => {
    try {
      const response = await fetch('/api/admin/check-permissions');
      const data = await response.json();
      
      if (data.success && data.isAdmin) {
        setIsAuthorized(true);
        await fetchData();
      } else {
        setIsAuthorized(false);
        setError('No tienes permisos de administrador');
      }
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      setIsAuthorized(false);
      setError('Error verificando permisos de administrador');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/sync-users');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data);
        if (data.stats) {
          console.log('Sync status:', data.stats);
        }
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkAdminPermissions();
    checkSyncStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando Administrador...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }


  useEffect(() => {
    if (selectedUser) {
      fetchUserSummary(selectedUser);
    }
  }, [selectedUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Error cargando usuarios');
      }

      const data = await response.json();
      setUsers(data.data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSummary = async (uid: string) => {
    try {
      const response = await fetch(`/api/admin/user/${uid}`);
      
      if (!response.ok) {
        throw new Error('Error cargando detalles del usuario');
      }

      const data = await response.json();
      setUserSummary(data.data);
    } catch (err) {
      console.error('Error fetching user summary:', err);
      setUserSummary(null);
    }
  };

  const generateEmail = async () => {
    if (!selectedUser || !userSummary) {
      alert('Por favor selecciona un usuario primero');
      return;
    }

    try {
      setIsGeneratingEmail(true);
      setError(null);

      console.log('Enviando datos:', {
        userData: userSummary.user,
        userSummary: userSummary
      });

      console.log('🤖 Enviando datos a ChatGPT...', {
        userEmail: userSummary.user.email,
        totalDocuments: userSummary.summary.totalDocuments,
        plan: userSummary.user.subscription?.plan
      });

      const response = await fetch('/api/admin/generate-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userData: userSummary.user,
          userSummary: userSummary
        }),
      });

      console.log('Respuesta recibida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      // Obtener metadatos de la respuesta
      const emailType = response.headers.get('X-Email-Type') || 'unknown';
      const chatgptUsed = response.headers.get('X-ChatGPT-Used') === 'true';
      const generationTime = response.headers.get('X-Generation-Time') || '0';

      // Obtener HTML generado
      const htmlContent = await response.text();
      console.log('HTML recibido:', htmlContent.length, 'caracteres');
      
      // Crear blob del HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(blob);
      
      setGeneratedEmail({
        pdfUrl: htmlUrl,
        subject: `Email de Fidelización (${emailType.toUpperCase()}) - ${userSummary.user.displayName || userSummary.user.email}`,
        userEmail: userSummary.user.email,
        fileName: `Email_Fidelizacion_${userSummary.user.email}_${Date.now()}.html`,
        size: htmlContent.length,
        metadata: {
          emailType,
          chatgptUsed,
          generationTime: parseInt(generationTime),
          aiGenerated: chatgptUsed
        }
      });

      console.log(`✅ Email generado: ${emailType} (ChatGPT: ${chatgptUsed}, ${generationTime}ms)`);
      setShowEmailFrame(true);
    } catch (err) {
      console.error('Error completo:', err);
      setError(err instanceof Error ? err.message : 'Error generando PDF');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedEmail) return;

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: generatedEmail.userEmail,
          pdfUrl: generatedEmail.pdfUrl,
          subject: generatedEmail.subject,
          userName: userSummary?.user.displayName || 'Cliente'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error enviando email');
      }

      const data = await response.json();
      if (data.success) {
        alert(`✅ Email enviado exitosamente a ${generatedEmail.userEmail}`);
        setShowEmailFrame(false);
        setGeneratedEmail(null);
      } else {
        throw new Error(data.error || 'Error enviando email');
      }
    } catch (err) {
      console.error('Error enviando email:', err);
      setError(err instanceof Error ? err.message : 'Error enviando email');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };


  const syncUsers = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data.summary);
        alert(`✅ Sincronización completada exitosamente!\n\n` +
              `📊 Resumen:\n` +
              `• Usuarios en Auth: ${data.summary.authUsers}\n` +
              `• Creados: ${data.summary.created}\n` +
              `• Actualizados: ${data.summary.updated}\n` +
              `• Eliminados: ${data.summary.deleted.users} usuarios\n` +
              `• Documentos eliminados: ${data.summary.deleted.documents}\n` +
              `• Compras eliminadas: ${data.summary.deleted.purchases}`);
        
        // Refresh users list
        await fetchData();
      } else {
        throw new Error(data.error?.message || 'Error during sync');
      }
    } catch (err) {
      console.error('Error syncing users:', err);
      setError(err instanceof Error ? err.message : 'Error syncing users');
    } finally {
      setIsSyncing(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'active') return user.isActive;
    if (filter === 'inactive') return !user.isActive;
    return true;
  });

  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation currentPlan="basic" />
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando dashboard administrativo...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de acceso denegado
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder al panel de administración.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Administrador</span>
            </div>
            
            <UserMenu user={user} currentPlan="Administrador" onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      <DashboardNavigation currentPlan="basic" />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard Administrativo
            </h1>
            <p className="text-gray-600">
              Gestión de usuarios y análisis del sistema
            </p>
          </div>

          {/* Sync Section */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Sincronización de Usuarios</h2>
                <p className="text-sm text-gray-500">
                  Sincronizar usuarios entre Firebase Authentication y Firestore
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={checkSyncStatus}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Ver Estado
                </button>
                <button
                  onClick={syncUsers}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Usuarios'}
                </button>
              </div>
            </div>

            {syncStatus && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Estado de Sincronización</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{syncStatus.authUsers}</div>
                    <div className="text-sm text-gray-500">En Auth</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{syncStatus.firestoreUsers}</div>
                    <div className="text-sm text-gray-500">En Firestore</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{syncStatus.orphanedUsers}</div>
                    <div className="text-sm text-gray-500">Huérfanos</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${syncStatus.orphanedUsers === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {syncStatus.orphanedUsers === 0 ? '✓' : '⚠'}
                    </div>
                    <div className="text-sm text-gray-500">Estado</div>
                  </div>
                </div>
                
                {syncStatus.orphanedUserIds && syncStatus.orphanedUserIds.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Usuarios huérfanos (en Firestore pero no en Auth):</p>
                    <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                      {syncStatus.orphanedUserIds.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando datos...</p>
            </div>
          ) : (
            <>
              {/* Estadísticas Generales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Total Usuarios</h3>
                  <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                  <p className="text-sm text-gray-500">Registrados</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Usuarios Activos</h3>
                  <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
                  <p className="text-sm text-gray-500">{((activeUsers.length / users.length) * 100).toFixed(1)}% del total</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Usuarios Inactivos</h3>
                  <p className="text-3xl font-bold text-red-600">{inactiveUsers.length}</p>
                  <p className="text-sm text-gray-500">{((inactiveUsers.length / users.length) * 100).toFixed(1)}% del total</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Tasa de Actividad</h3>
                  <p className="text-3xl font-bold text-purple-600">{((activeUsers.length / users.length) * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Usuarios activos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lista de Usuarios */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Usuarios</h2>
                    <p className="text-sm text-gray-500">Total: {users.length} usuarios</p>
                    
                    {/* Filtros */}
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 text-xs rounded-full ${
                          filter === 'all' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Todos ({users.length})
                      </button>
                      <button
                        onClick={() => setFilter('active')}
                        className={`px-3 py-1 text-xs rounded-full ${
                          filter === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Activos ({activeUsers.length})
                      </button>
                      <button
                        onClick={() => setFilter('inactive')}
                        className={`px-3 py-1 text-xs rounded-full ${
                          filter === 'inactive' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Inactivos ({inactiveUsers.length})
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {users.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.displayName || user.email} ({user.uid.slice(0, 8)}...)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.uid}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          selectedUser === user.uid ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedUser(user.uid)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.displayName || 'Sin nombre'}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {user.stats?.totalDocuments || 0} docs
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(user.stats?.totalSpent || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {user.isActive ? (
                              <span className="text-green-600 font-medium">● Activo</span>
                            ) : (
                              <span className="text-red-500 font-medium">● Inactivo</span>
                            )}
                          </span>
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Última actividad: {formatDate(user.lastLoginAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detalles del Usuario Seleccionado */}
              <div className="lg:col-span-2">
                {selectedUser && userSummary ? (
                  <div className="space-y-6">
                    {/* Información del Usuario */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Información del Usuario
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{userSummary.user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Nombre</p>
                          <p className="font-medium">
                            {userSummary.user.displayName || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Registrado</p>
                          <p className="font-medium">{formatDate(userSummary.user.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Última actividad</p>
                          <p className="font-medium">{formatDate(userSummary.user.lastLoginAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Plan</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanColor(userSummary.user.subscription?.plan || 'free')}`}>
                            {userSummary.user.subscription?.plan || 'Gratuito'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estado</p>
                          <p className="font-medium">
                            {userSummary.user.isActive ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas del Usuario */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="font-semibold text-gray-900">Documentos</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {userSummary.summary.totalDocuments}
                        </p>
                        <p className="text-xs text-gray-500">Total generados</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="font-semibold text-gray-900">Gastado</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(userSummary.summary.totalSpent)}
                        </p>
                        <p className="text-xs text-gray-500">Total invertido</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="font-semibold text-gray-900">Tasa de Éxito</h4>
                        <p className="text-2xl font-bold text-purple-600">
                          {(userSummary.summary.successRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Generaciones exitosas</p>
                      </div>
                    </div>

                    {/* Generaciones Recientes */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Generaciones Recientes
                      </h3>
                      {userSummary.recentGenerations.length > 0 ? (
                        <div className="space-y-3">
                          {userSummary.recentGenerations.slice(0, 5).map((gen, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{gen.tipoEscrito}</p>
                                <p className="text-sm text-gray-500">{gen.areaLegal}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatDate(gen.createdAt)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(gen.pricing?.cost || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No hay generaciones recientes</p>
                      )}
                    </div>

                    {/* Analytics del Usuario */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Análisis de Actividad
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900">Tiempo Promedio</h4>
                          <p className="text-2xl font-bold text-blue-600">
                            {userSummary.summary.averageProcessingTime}ms
                          </p>
                          <p className="text-xs text-blue-700">Procesamiento por documento</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900">Última Actividad</h4>
                          <p className="text-lg font-bold text-green-600">
                            {formatDate(userSummary.summary.lastActivity)}
                          </p>
                          <p className="text-xs text-green-700">Última generación</p>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Generación de Email */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Email de Fidelización
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Genera un HTML personalizado usando IA para fidelizar al cliente
                      </p>
                      <button
                        onClick={generateEmail}
                        disabled={isGeneratingEmail}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isGeneratingEmail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generando HTML con IA...</span>
                          </>
                        ) : (
                          <>
                            <span>🤖</span>
                            <span>Generar HTML con ChatGPT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : selectedUser ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p>Cargando detalles del usuario...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center text-gray-500">
                      <p>Selecciona un usuario para ver sus detalles</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          {/* Frame para mostrar PDF del Email */}
          {showEmailFrame && generatedEmail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
              <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[95vh] flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                      📧 Email de Fidelización Generado por IA
                    </h3>
                    <button
                      onClick={() => {
                        setShowEmailFrame(false);
                        // Limpiar recursos si es necesario
                        setGeneratedEmail(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Para: {generatedEmail.userEmail} | {generatedEmail.subject}
                      <br />
                      Archivo: {generatedEmail.fileName} ({(generatedEmail.size / 1024).toFixed(1)} KB)
                    </p>
                    
                    {/* Información de ChatGPT */}
                    {generatedEmail.metadata && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-800">Tipo:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {generatedEmail.metadata.emailType.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-800">IA:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              generatedEmail.metadata.chatgptUsed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {generatedEmail.metadata.chatgptUsed ? 'ChatGPT' : 'Fallback'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-800">Tiempo:</span>
                            <span className="text-blue-600">{generatedEmail.metadata.generationTime}ms</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 p-6 overflow-hidden">
                  <div className="h-full">
                    <iframe
                      src={generatedEmail.pdfUrl}
                      className="w-full h-full border border-gray-300 rounded-lg"
                      title="Email PDF Preview"
                      style={{ minHeight: '600px' }}
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex space-x-3">
                    <a
                      href={generatedEmail.pdfUrl}
                      download={generatedEmail.fileName}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <span>📥</span>
                      <span>Descargar PDF</span>
                    </a>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowEmailFrame(false);
                        // Limpiar recursos si es necesario
                        setGeneratedEmail(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={sendEmail}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <span>📤</span>
                      <span>Enviar Email</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}