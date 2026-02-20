'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import TutelaProcessSimple from './TutelaProcessSimple';
import PurchaseHistoryComponent from './PurchaseHistory';
import ErrorBoundary from './ErrorBoundary';
import { useDashboardAuth } from '@/contexts/DashboardAuthContext';

const AUTOSERVICIO_TUTELA_PATH = '/dashboard/autoservicio/accion-tutela';

function AccionTutelaContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useDashboardAuth();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollPurchaseStatus = async (purchaseId?: string | null) => {
    if (!user || !db) return false;
    try {
      const purchasesRef = collection(db, 'purchases');
      let purchaseDoc;
      if (purchaseId) {
        purchaseDoc = await getDoc(doc(db, 'purchases', purchaseId));
        if (!purchaseDoc.exists()) return false;
      } else {
        const q = query(
          purchasesRef,
          where('userId', '==', user.uid),
          where('documentType', '==', 'accion_tutela'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return false;
        purchaseDoc = snapshot.docs[0];
      }
      const purchaseData = purchaseDoc.data();
      const totalItems = purchaseData.items?.length || 0;
      const items = purchaseData.items || [];
      const completedItems = items.filter((item: any) => item.status === 'completed').length;
      const failedItems = items.filter((item: any) => item.status === 'failed').length;
      const allItemsProcessed = (completedItems + failedItems) === totalItems && totalItems > 0;
      const documentsReady = allItemsProcessed || purchaseData.status === 'completed';

      if (documentsReady) {
        const finalStatus = completedItems > 0 || purchaseData.status === 'completed' ? 'completed' : 'failed';
        setProcessingStatus(finalStatus);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (finalStatus === 'completed') {
          setTimeout(() => {
            setShowPaymentSuccess(false);
            setProcessingStatus(null);
            setProcessingPurchaseId(null);
          }, 10000);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const startPolling = (purchaseId?: string | null) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setProcessingStatus('processing');
    setShowPaymentSuccess(true);
    const initialTimeout = setTimeout(() => {
      pollPurchaseStatus(purchaseId);
      pollingIntervalRef.current = setInterval(async () => {
        const isComplete = await pollPurchaseStatus(purchaseId);
        if (isComplete) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 3000);
    }, 2000);
    return () => clearTimeout(initialTimeout);
  };

  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'success') {
      router.replace(AUTOSERVICIO_TUTELA_PATH, { scroll: false });
      if (user && db) startPolling();
    }
    if (paymentStatus === 'cancelled') {
      alert('Pago cancelado. Puedes intentar de nuevo cuando estés listo.');
      router.replace(AUTOSERVICIO_TUTELA_PATH, { scroll: false });
    }
  }, [searchParams, user, db, router]);

  useEffect(() => {
    if (!user || !db) return;
    if (pollingIntervalRef.current) return;
    const checkPending = async () => {
      if (!db) return;
      const q = query(
        collection(db as any, 'purchases'),
        where('userId', '==', user.uid),
        where('documentType', '==', 'accion_tutela')
      );
      const snap = await getDocs(q);
      const pending = snap.docs.filter((d) => {
        const data = d.data();
        const items = data.items || [];
        const completed = items.filter((i: any) => i.status === 'completed').length;
        const failed = items.filter((i: any) => i.status === 'failed').length;
        return (completed + failed) < items.length && items.length > 0;
      });
      if (pending.length > 0) {
        const sorted = pending.sort((a, b) => {
          const at = a.data().createdAt?.toMillis?.() || 0;
          const bt = b.data().createdAt?.toMillis?.() || 0;
          return bt - at;
        });
        startPolling(sorted[0].id);
      }
    };
    const t = setTimeout(checkPending, 1000);
    return () => clearTimeout(t);
  }, [user, db]);

  useEffect(() => () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  if (!user) return null;

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showPaymentSuccess && (
            <div className="mb-6">
              {processingStatus === 'processing' && (
                <div className="bg-surface-muted/20 border-l-4 border-sidebar p-4 rounded-md shadow-sm">
                  <div className="flex items-start">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">¡Pago exitoso! Procesando tu compra...</h3>
                      <p className="mt-1 text-sm text-blue-700">Por favor, no cierres esta página.</p>
                    </div>
                  </div>
                </div>
              )}
              {processingStatus === 'completed' && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md shadow-sm">
                  <h3 className="text-sm font-medium text-green-800">¡Compra procesada exitosamente!</h3>
                </div>
              )}
              {processingStatus === 'failed' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
                  <h3 className="text-sm font-medium text-red-800">Error al procesar compra</h3>
                </div>
              )}
            </div>
          )}
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>Acción de Tutela</strong> - Herramientas especializadas para acciones de tutela en Colombia
            </p>
          </div>
          <h1 className="text-h1 text-text-primary mb-8">Panel de Acción de Tutela</h1>
          <div className="bg-card overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-h3 text-text-primary mb-2">¡Bienvenido a Avocat para Acciones de Tutela!</h3>
              <p className="text-body text-text-secondary">
                Genera una acción de tutela profesional conforme a la Constitución Política (art. 86) y el Decreto 2591 de 1991.
              </p>
            </div>
          </div>
          <TutelaProcessSimple userId={user.uid} userEmail={user.email || undefined} />
          <div className="mt-12">
            <PurchaseHistoryComponent userId={user.uid} documentType="accion_tutela" />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function AccionTutelaPageContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>}>
      <AccionTutelaContentInner />
    </Suspense>
  );
}
