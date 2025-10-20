'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
import ErrorBoundary from '@/components/ErrorBoundary';

interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as any, (u) => {
      try {
        setUser(u);
        setIsFirebaseReady(true);
        setAuthChecked(true);
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setIsFirebaseReady(true);
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authChecked && isFirebaseReady && !user) {
      router.push('/login');
    }
  }, [authChecked, isFirebaseReady, user, router]);

  // Check admin permissions
  const checkAdminPermissions = async () => {
    try {
      if (!user?.uid) {
        setIsAuthorized(false);
        setAdminChecked(true);
        return;
      }

      console.log(`🔐 Checking admin permissions for UID: ${user.uid}`);
      
      // Query Firestore users collection for the user's isAdmin attribute
      const userDocRef = doc(db as any, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isAdminUser = userData.isAdmin === true;
        
        console.log('📊 User data from Firestore:', userData);
        console.log('🔐 Admin check result:', { uid: user.uid, isAdminUser });
        
        if (isAdminUser) {
          console.log('✅ Setting isAuthorized to true');
          setIsAuthorized(true);
          await fetchData();
        } else {
          console.log('❌ Setting isAuthorized to false - user is not admin');
          setIsAuthorized(false);
          setError('No tienes permisos de administrador');
        }
      } else {
        console.log(`❌ User document not found in Firestore for UID: ${user.uid}`);
        setIsAuthorized(false);
        setError('Usuario no encontrado en la base de datos');
      }
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      setIsAuthorized(false);
      setError('Error verificando permisos de administrador');
    } finally {
      setAdminChecked(true);
    }
  };

  // Mock sync status for static export mode
  const checkSyncStatus = () => {
    const mockSyncStatus = {
      success: true,
      stats: {
        totalUsers: 1,
        activeUsers: 1,
        disabledUsers: 0,
        lastSync: new Date().toISOString()
      }
    };
    setSyncStatus(mockSyncStatus);
    console.log('Mock sync status:', mockSyncStatus.stats);
  };

  // Mock data for static export mode
  const fetchData = async () => {
    try {
      setLoading(true);
      const mockUsers = [
        {
          uid: 'jdwWMhOqVCggIRjLVBtxbvhOwPq1',
          email: 'admin@example.com',
          displayName: 'Admin User',
          isAdmin: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }
      ];
      setUsers(mockUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Mock user summary for static export mode
  const fetchUserSummary = async (uid: string) => {
    try {
      const mockUserSummary = {
        uid: uid,
        email: 'admin@example.com',
        displayName: 'Admin User',
        isAdmin: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        totalCases: 0,
        activeCases: 0,
        completedCases: 0
      };
      setUserSummary(mockUserSummary);
    } catch (err) {
      console.error('Error fetching user summary:', err);
      setUserSummary(null);
    }
  };

  // Mock email generation for static export mode
  const generateEmail = async () => {
    if (!selectedUser || !userSummary) {
      alert('Por favor selecciona un usuario primero');
      return;
    }

    try {
      setIsGeneratingEmail(true);
      setError(null);

      console.log('🤖 Mock email generation for static export mode...');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mock Email - ${userSummary.displayName}</title>
        </head>
        <body>
          <h1>Mock Email Content</h1>
          <p>This is a mock email generated for static export mode.</p>
          <p>User: ${userSummary.displayName}</p>
          <p>Email: ${userSummary.email}</p>
          <p>Generated at: ${new Date().toISOString()}</p>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mock-email-${selectedUser}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Mock email generated and downloaded successfully');

    } catch (error) {
      console.error('Error generando email:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // Mock send email for static export mode
  const sendEmail = async () => {
    if (!selectedUser || !userSummary) {
      alert('Por favor selecciona un usuario primero');
      return;
    }

    try {
      console.log('📧 Mock email sending for static export mode...');
      alert('Mock email sent successfully! (This is a demo for static export mode)');
    } catch (error) {
      console.error('Error enviando email:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  // Mock sync users for static export mode
  const syncUsers = async () => {
    try {
      console.log('🔄 Mock user sync for static export mode...');
      alert('Mock user sync completed! (This is a demo for static export mode)');
      checkSyncStatus();
    } catch (error) {
      console.error('Error syncing users:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth as any);
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Initialize component
  useEffect(() => {
    setMounted(true);
    checkAdminPermissions();
    checkSyncStatus();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    console.log('🔄 Redirect check:', { adminChecked, isAuthorized });
    if (adminChecked && !isAuthorized) {
      console.log('🚫 Redirecting non-admin user to dashboard');
      router.push('/dashboard');
    }
  }, [adminChecked, isAuthorized, router]);

  // Fetch user summary when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserSummary(selectedUser);
    }
  }, [selectedUser]);

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

  if (!mounted) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta sección.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Volver al Dashboard
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
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Administrador</h1>
              </div>
              <div className="flex items-center space-x-4">
                <UserMenu user={user} onSignOut={handleSignOut} />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <DashboardNavigation currentPlan="administrador" user={user} />
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-8">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              {syncStatus && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-green-400">✅</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Estado de Sincronización</h3>
                      <div className="mt-1 text-sm text-green-700">
                        Última sincronización: {new Date(syncStatus.stats.lastSync).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Management */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Gestión de Usuarios
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User List */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Usuarios</h4>
                      <div className="space-y-2">
                        {users.map((user) => (
                          <div
                            key={user.uid}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedUser === user.uid
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedUser(user.uid)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.displayName}
                                </p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {user.isAdmin && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Admin
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    user.isActive
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {user.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* User Actions */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Acciones</h4>
                      <div className="space-y-3">
                        <button
                          onClick={generateEmail}
                          disabled={!selectedUser || isGeneratingEmail}
                          className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingEmail ? 'Generando...' : 'Generar Email'}
                        </button>
                        
                        <button
                          onClick={sendEmail}
                          disabled={!selectedUser}
                          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Enviar Email
                        </button>
                        
                        <button
                          onClick={syncUsers}
                          className="w-full btn-secondary"
                        >
                          Sincronizar Usuarios
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* User Summary */}
                  {userSummary && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-md font-medium text-gray-900 mb-3">
                        Resumen del Usuario
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">{userSummary.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estado</p>
                          <p className="text-sm font-medium text-gray-900">
                            {userSummary.isActive ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Creado</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(userSummary.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Último Login</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(userSummary.lastLoginAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}