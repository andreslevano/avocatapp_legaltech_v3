'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import { Ban, CircleCheck, TriangleAlert } from 'lucide-react';

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

  // Redirect non-admin users - only after we've actually checked and confirmed they're not admin
  useEffect(() => {
    console.log('🔄 Redirect check:', { adminChecked, isAuthorized });
    // Only redirect if we've completed the admin check AND confirmed they're not authorized
    // Add a small delay to ensure Firestore query has completed
    if (adminChecked && isAuthorized === false) {
      const redirectTimer = setTimeout(() => {
        console.log('🚫 Redirecting non-admin user to dashboard');
        router.push('/agent');
      }, 100); // Small delay to ensure Firestore query completed
      
      return () => clearTimeout(redirectTimer);
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-status-en-revision-border mx-auto"></div>
          <p className="mt-4 text-text-muted">Cargando Administrador...</p>
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-danger-subtle rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban size={28} className="text-danger-text" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Acceso Denegado</h2>
          <p className="text-text-muted mb-4">No tienes permisos para acceder a esta sección.</p>
          <Button onClick={() => router.push('/agent')}
            variant="primary"
          >
            Volver a Avocat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Administrador</h1>
        </div>
        <div>
              {error && (
                <div className="mb-6 bg-danger-subtle border border-status-urgente-border rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <TriangleAlert size={18} className="text-danger-text" aria-hidden />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-danger-text">Error</h3>
                      <div className="mt-2 text-sm text-danger-text">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              {syncStatus && (
                <div className="mb-6 bg-success-subtle border border-status-a-tiempo-border rounded-md p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CircleCheck size={18} className="text-success-text" aria-hidden />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-success-text">Estado de Sincronización</h3>
                      <div className="mt-1 text-sm text-success-text">
                        Última sincronización: {new Date(syncStatus.stats.lastSync).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Management */}
              <div className="bg-surface shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-text mb-4">
                    Gestión de Usuarios
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User List */}
                    <div>
                      <h4 className="text-md font-medium text-text mb-3">Usuarios</h4>
                      <div className="space-y-2">
                        {users.map((user) => (
                          <div
                            key={user.uid}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedUser === user.uid
                                ? 'border-status-en-revision-border bg-info-subtle'
                                : 'border-border hover:border-border'
                            }`}
                            onClick={() => setSelectedUser(user.uid)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-text">
                                  {user.displayName}
                                </p>
                                <p className="text-sm text-text-muted">{user.email}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {user.isAdmin && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-subtle text-info-text">
                                    Admin
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    user.isActive
                                      ? 'bg-success-subtle text-success-text'
                                      : 'bg-danger-subtle text-danger-text'
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
                      <h4 className="text-md font-medium text-text mb-3">Acciones</h4>
                      <div className="space-y-3">
                        <Button onClick={generateEmail}
                          disabled={!selectedUser || isGeneratingEmail}
                          variant="secondary" block
                        >
                          {isGeneratingEmail ? 'Generando...' : 'Generar Email'}
                        </Button>
                        
                        <Button onClick={sendEmail}
                          disabled={!selectedUser}
                          variant="primary" block
                        >
                          Enviar Email
                        </Button>
                        
                        <Button onClick={syncUsers}
                          variant="secondary" block
                        >
                          Sincronizar Usuarios
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* User Summary */}
                  {userSummary && (
                    <div className="mt-6 p-4 bg-bg rounded-lg">
                      <h4 className="text-md font-medium text-text mb-3">
                        Resumen del Usuario
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-text-muted">Email</p>
                          <p className="text-sm font-medium text-text">{userSummary.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Estado</p>
                          <p className="text-sm font-medium text-text">
                            {userSummary.isActive ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Creado</p>
                          <p className="text-sm font-medium text-text">
                            {new Date(userSummary.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Último Login</p>
                          <p className="text-sm font-medium text-text">
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
    </ErrorBoundary>
  );
}