'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import DashboardNavigation from '@/components/DashboardNavigation';
import TutelaProcessSimple from '@/components/TutelaProcessSimple';
import PurchaseHistoryComponent from '@/components/PurchaseHistory';
import UserMenu from '@/components/UserMenu';
import ErrorBoundary from '@/components/ErrorBoundary';

function AccionTutelaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Payment success and polling state (similar to estudiantes)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Defer any redirect until we have definitively checked auth state
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (u) => {
        // Only update state, don't redirect immediately
        // Firebase will restore the session from localStorage
        setUser(u);
        setAuthChecked(true);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    // Only redirect if we've definitely checked auth and confirmed no user
    // Add a small delay to allow Firebase to restore session from localStorage
    if (authChecked && !user && isFirebaseReady) {
      const timer = setTimeout(() => {
        // Double-check auth state before redirecting
        if (auth && auth.currentUser === null) {
          // Use replace instead of push to avoid adding to history
          router.replace('/login');
        }
      }, 1000); // Give Firebase more time to restore session from localStorage
      
      return () => clearTimeout(timer);
    }
  }, [authChecked, user, router, isFirebaseReady]);

  // Helper function to convert Firestore Timestamp to Date
  const toDate = (value: any): Date => {
    if (!value) return new Date();
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (value.seconds) return new Date(value.seconds * 1000);
    return new Date(value);
  };

  // Polling function - checks purchase status and updates UI
  const pollPurchaseStatus = async (purchaseId?: string | null) => {
    if (!user || !db) {
      return false;
    }
    
    try {
      const purchasesRef = collection(db, 'purchases');
      let purchaseDoc;
      
      if (purchaseId) {
        try {
          const purchaseRef = doc(db, 'purchases', purchaseId);
          purchaseDoc = await getDoc(purchaseRef);
          if (!purchaseDoc.exists()) {
            console.warn('Purchase not found:', purchaseId);
            return false;
          }
        } catch (error) {
          console.error('Error fetching purchase by ID:', error);
          return false;
        }
      } else {
        // Get the most recent purchase for this user with documentType accion_tutela
        try {
          const q = query(
            purchasesRef,
            where('userId', '==', user.uid),
            where('documentType', '==', 'accion_tutela'),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            return false;
          }
          
          purchaseDoc = snapshot.docs[0];
        } catch (error: any) {
          // Fallback: try without orderBy
          console.warn('orderBy failed, trying without it:', error);
          try {
            const q = query(
              purchasesRef,
              where('userId', '==', user.uid),
              where('documentType', '==', 'accion_tutela')
            );
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              return false;
            }
            
            // Sort manually by createdAt
            const sortedDocs = snapshot.docs.sort((a, b) => {
              const aData = a.data();
              const bData = b.data();
              const aTime = aData.createdAt?.toMillis?.() || aData.createdAt?.seconds || aData.createdAt || 0;
              const bTime = bData.createdAt?.toMillis?.() || bData.createdAt?.seconds || bData.createdAt || 0;
              return bTime - aTime;
            });
            
            purchaseDoc = sortedDocs[0];
          } catch (fallbackError) {
            console.error('Error fetching purchases:', fallbackError);
            return false;
          }
        }
      }
      
      if (!purchaseDoc) {
        return false;
      }
      
      const purchaseData = purchaseDoc.data();
      const currentPurchaseId = purchaseDoc.id;
      
      setProcessingPurchaseId(currentPurchaseId);
      
      // Check if documents are generated
      const documentsGenerated = purchaseData.documentsGenerated ?? 0;
      const documentsFailed = purchaseData.documentsFailed ?? 0;
      const totalItems = purchaseData.items?.length || 0;
      
      // Also check item statuses
      const items = purchaseData.items || [];
      const completedItems = items.filter((item: any) => item.status === 'completed').length;
      const failedItems = items.filter((item: any) => item.status === 'failed').length;
      
      // For accion_tutela, documents are ready when:
      // 1. All items have status 'completed' or 'failed', OR
      // 2. Purchase status is 'completed'
      const allItemsProcessed = (completedItems + failedItems) === totalItems && totalItems > 0;
      const documentsReady = allItemsProcessed || purchaseData.status === 'completed';
      
      if (documentsGenerated > 0 && documentsGenerated < totalItems) {
        setProcessingStatus('processing');
      }
      
      if (documentsReady) {
        const finalStatus = (completedItems > 0 || purchaseData.status === 'completed') ? 'completed' : 'failed';
        
        setProcessingStatus(finalStatus);
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Auto-hide success banner after 10 seconds
        if (finalStatus === 'completed') {
          setTimeout(() => {
            setShowPaymentSuccess(false);
            setProcessingStatus(null);
            setProcessingPurchaseId(null);
          }, 10000);
        }
        
        return true;
      }
      
      setPollingAttempts(prev => prev + 1);
      return false;
    } catch (error) {
      console.error('Error polling purchase status:', error);
      setPollingAttempts(prev => prev + 1);
      return false;
    }
  };

  // Start polling with a specific purchase ID or find the most recent pending purchase
  const startPolling = (purchaseId?: string | null) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setPollingAttempts(0);
    setProcessingStatus('processing');
    setShowPaymentSuccess(true);
    
    let attempts = 0;
    const MAX_ATTEMPTS = 200; // 200 attempts × 3 seconds = 10 minutes
    
    // Poll immediately after a short delay
    const initialTimeout = setTimeout(() => {
      pollPurchaseStatus(purchaseId);
      
      pollingIntervalRef.current = setInterval(async () => {
        attempts++;
        setPollingAttempts(attempts);
        
        const isComplete = await pollPurchaseStatus(purchaseId);
        
        if (isComplete || attempts >= MAX_ATTEMPTS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          if (attempts >= MAX_ATTEMPTS && !isComplete) {
            const finalCheck = await pollPurchaseStatus(purchaseId);
            if (!finalCheck) {
              setProcessingStatus('failed');
              console.warn('Polling timeout reached after', MAX_ATTEMPTS, 'attempts');
            }
          }
        }
      }, 3000);
    }, 2000);
    
    return () => {
      clearTimeout(initialTimeout);
    };
  };

  // Check for payment success and start polling
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    
    if (paymentStatus === 'success') {
      // Remove query parameter from URL
      router.replace('/dashboard/accion-tutela', { scroll: false });
      
      // Start polling if user is loaded
      if (user && db) {
        startPolling();
      }
    }
    
    if (paymentStatus === 'cancelled') {
      alert('Pago cancelado. Puedes intentar de nuevo cuando estés listo.');
      router.replace('/dashboard/accion-tutela', { scroll: false });
    }
  }, [searchParams, user, db, router]);

  // Persistent polling: Check for pending purchases on page load
  useEffect(() => {
    if (!user || !db || !authChecked || !isFirebaseReady) {
      return;
    }
    
    if (pollingIntervalRef.current) {
      return;
    }
    
    const checkPendingPurchases = async () => {
      if (!db) {
        return;
      }
      
      try {
        const purchasesRef = collection(db, 'purchases');
        
        const allPurchasesQuery = query(
          purchasesRef,
          where('userId', '==', user.uid),
          where('documentType', '==', 'accion_tutela')
        );
        
        const allSnapshot = await getDocs(allPurchasesQuery);
        const pendingPurchases = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          const status = data.status;
          const documentsGenerated = data.documentsGenerated ?? 0;
          const totalItems = data.items?.length || 0;
          const items = data.items || [];
          const completedItems = items.filter((item: any) => item.status === 'completed').length;
          const failedItems = items.filter((item: any) => item.status === 'failed').length;
          
          // Consider pending if status is pending/processing or documents not complete
          return (status === 'pending' || status === 'processing' || 
                  ((completedItems + failedItems) < totalItems && totalItems > 0));
        });
        
        if (pendingPurchases.length > 0) {
          const sorted = pendingPurchases.sort((a, b) => {
            const aData = a.data();
            const bData = b.data();
            const aTime = aData.createdAt?.toMillis?.() || aData.createdAt?.seconds || aData.createdAt || 0;
            const bTime = bData.createdAt?.toMillis?.() || bData.createdAt?.seconds || bData.createdAt || 0;
            return bTime - aTime;
          });
          
          const pendingPurchase = sorted[0];
          const purchaseData = pendingPurchase.data();
          const purchaseId = pendingPurchase.id;
          
          const documentsGenerated = purchaseData.documentsGenerated ?? 0;
          const totalItems = purchaseData.items?.length || 0;
          const items = purchaseData.items || [];
          const completedItems = items.filter((item: any) => item.status === 'completed').length;
          const failedItems = items.filter((item: any) => item.status === 'failed').length;
          
          if ((completedItems + failedItems) < totalItems) {
            console.log('Found pending accion_tutela purchase, starting polling:', purchaseId);
            startPolling(purchaseId);
          }
        }
      } catch (error) {
        console.error('Error checking for pending purchases:', error);
      }
    };
    
    const checkTimeout = setTimeout(checkPendingPurchases, 1000);
    
    return () => {
      clearTimeout(checkTimeout);
    };
  }, [user, db, authChecked, isFirebaseReady]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

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

  // Show loading state while checking auth
  if (loading || !authChecked || !isFirebaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando Acción de Tutela...</p>
        </div>
      </div>
    );
  }

  // Only redirect if we've confirmed no user after auth check
  if (!user) {
    // Don't render anything, the redirect will happen in useEffect
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
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
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Acción de Tutela</span>
              </div>
              
              <UserMenu user={user} currentPlan="Tutela" onSignOut={handleSignOut} />
            </div>
          </div>
        </header>

        <DashboardNavigation currentPlan="basic" user={user} />

        {/* Payment Success & Processing Status Banner */}
        {showPaymentSuccess && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            {processingStatus === 'processing' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      ¡Pago exitoso! Procesando tu compra...
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Estamos procesando tu compra. Esto puede tardar unos minutos.</p>
                      <p className="mt-1 text-xs text-blue-600">Por favor, no cierres esta página. Te notificaremos cuando esté listo.</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => setShowPaymentSuccess(false)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {processingStatus === 'completed' && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">
                      ¡Compra procesada exitosamente!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Tu compra ha sido procesada. Puedes encontrar los detalles en tu historial de compras a continuación.</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => {
                        setShowPaymentSuccess(false);
                        setProcessingStatus(null);
                      }}
                      className="text-green-400 hover:text-green-600"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {processingStatus === 'failed' && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Error al procesar compra
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Hubo un problema al procesar tu compra. Por favor, contacta con soporte o intenta realizar otra compra.</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => {
                        setShowPaymentSuccess(false);
                        setProcessingStatus(null);
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                <strong>Dashboard de Acción de Tutela</strong> - Herramientas especializadas para acciones de tutela en Colombia
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
                  Genera una acción de tutela profesional conforme a la Constitución Política (art. 86) y el Decreto 2591 de 1991.
                </p>
              </div>
            </div>

            {/* Document Processing Workflow */}
            <TutelaProcessSimple userId={user?.uid} userEmail={user?.email || undefined} />

            {/* Purchase History Section */}
            <div className="mt-12">
              <PurchaseHistoryComponent userId={user?.uid || 'demo_user'} documentType="accion_tutela" />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default function AccionTutelaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando Acción de Tutela...</p>
        </div>
      </div>
    }>
      <AccionTutelaContent />
    </Suspense>
  );
}
