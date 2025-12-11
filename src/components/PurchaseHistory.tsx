'use client';

import { useState, useCallback, useEffect } from 'react';
import { PurchaseHistory } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Purchase } from '@/types/purchase';

interface PurchaseHistoryProps {
  userId: string; // Ahora es requerido
  documentType?: 'reclamacion_cantidades' | 'accion_tutela';
}

// Mock data for demonstration
const mockPurchaseHistory: PurchaseHistory[] = [
  {
    id: '1',
    userId: 'user1',
    documentTitle: 'Reclamación de Cantidades - 15/12/2024',
    documentType: 'reclamacion_cantidades',
    purchaseDate: new Date('2024-12-15T10:30:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 6,
    accuracy: 85,
    amountClaimed: 1850.00,
    files: {
      wordUrl: '/documents/reclamacion-1.docx',
      pdfUrl: '/documents/reclamacion-1.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-15T10:35:00')
  },
  {
    id: '2',
    userId: 'user1',
    documentTitle: 'Reclamación de Cantidades - 10/12/2024',
    documentType: 'reclamacion_cantidades',
    purchaseDate: new Date('2024-12-10T14:20:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 4,
    accuracy: 60,
    amountClaimed: 1650.25,
    files: {
      wordUrl: '/documents/reclamacion-2.docx',
      pdfUrl: '/documents/reclamacion-2.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-10T14:25:00')
  },
  {
    id: '3',
    userId: 'user1',
    documentTitle: 'Reclamación de Cantidades - 05/12/2024',
    documentType: 'reclamacion_cantidades',
    purchaseDate: new Date('2024-12-05T09:15:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 8,
    accuracy: 95,
    amountClaimed: 1995.50,
    files: {
      wordUrl: '/documents/reclamacion-3.docx',
      pdfUrl: '/documents/reclamacion-3.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-05T09:20:00')
  },
  {
    id: '4',
    userId: 'user1',
    documentTitle: 'Acción de Tutela - 18/12/2024',
    documentType: 'accion_tutela',
    purchaseDate: new Date('2024-12-18T11:45:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 5,
    accuracy: 90,
    files: {
      wordUrl: '/documents/tutela-1.docx',
      pdfUrl: '/documents/tutela-1.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-18T11:50:00')
  },
  {
    id: '5',
    userId: 'user1',
    documentTitle: 'Acción de Tutela - 12/12/2024',
    documentType: 'accion_tutela',
    purchaseDate: new Date('2024-12-12T16:30:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 7,
    accuracy: 75,
    files: {
      wordUrl: '/documents/tutela-2.docx',
      pdfUrl: '/documents/tutela-2.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-12T16:35:00')
  },
  {
    id: '6',
    userId: 'user1',
    documentTitle: 'Acción de Tutela - 08/12/2024',
    documentType: 'accion_tutela',
    purchaseDate: new Date('2024-12-08T09:20:00'),
    price: 10.00,
    currency: 'EUR',
    status: 'completed',
    documentCount: 4,
    accuracy: 88,
    files: {
      wordUrl: '/documents/tutela-3.docx',
      pdfUrl: '/documents/tutela-3.pdf'
    },
    emailSent: true,
    emailSentAt: new Date('2024-12-08T09:25:00')
  }
];

export default function PurchaseHistoryComponent({ userId, documentType }: PurchaseHistoryProps) {
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PurchaseHistory | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());

  // Helper function to convert Timestamp | Date to Date
  const toDate = (value: Date | Timestamp | undefined | null): Date => {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    return new Date(value as any);
  };

  // Función para obtener el historial desde Firestore
  const fetchPurchaseHistory = useCallback(async () => {
    if (!userId || !db) {
      setLoading(false);
      setPurchaseHistory([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Cargando historial de compras desde Firestore...');
      
      // Query purchases desde Firestore
      const purchasesCollection = collection(db, 'purchases');
      let purchasesQuery;
      
      try {
        // Si hay documentType, filtrar por él
        if (documentType) {
          purchasesQuery = query(
            purchasesCollection,
            where('userId', '==', userId),
            where('documentType', '==', documentType),
            orderBy('createdAt', 'desc')
          );
        } else {
          purchasesQuery = query(
            purchasesCollection,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          );
        }
      } catch (queryError: any) {
        // Si falla el orderBy (puede faltar índice), intentar sin orderBy
        console.warn('⚠️ No se pudo aplicar orderBy, usando consulta básica:', queryError);
        
        // Si el error es por falta de índice, no es un error crítico
        if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
          // Intentar sin orderBy
          if (documentType) {
            purchasesQuery = query(
              purchasesCollection,
              where('userId', '==', userId),
              where('documentType', '==', documentType)
            );
          } else {
            purchasesQuery = query(
              purchasesCollection,
              where('userId', '==', userId)
            );
          }
        } else {
          // Otro tipo de error en la query - lanzar para manejarlo en el catch externo
          throw queryError;
        }
      }
      
      const snapshot = await getDocs(purchasesQuery);
      
      // Convertir purchases de Firestore a PurchaseHistory
      const formattedData: PurchaseHistory[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as Purchase;
          
          // Convertir PurchaseStatus a PurchaseHistory status
          // PurchaseHistory solo acepta 'completed' | 'pending' | 'failed'
          let historyStatus: 'completed' | 'pending' | 'failed' = 'pending';
          if (data.status === 'completed') {
            historyStatus = 'completed';
          } else if (data.status === 'failed') {
            historyStatus = 'failed';
          } else if (data.status === 'cancelled' || data.status === 'refunded') {
            // Tratar cancelled y refunded como failed para el historial
            historyStatus = 'failed';
          } else {
            historyStatus = 'pending';
          }
          
          // Obtener el primer item para extraer información
          const firstItem = data.items?.[0] || {};
          
          // Obtener packageFiles del primer item
          const packageFiles = firstItem.packageFiles || {};
          
          // Determinar URLs según documentType
          let files: PurchaseHistory['files'] = {};
          
          if (data.documentType === 'accion_tutela') {
            // Para accion_tutela: tutelaPdf y tutelaDocx
            files = {
              pdfUrl: packageFiles.tutelaPdf?.downloadUrl || firstItem.downloadUrl || undefined,
              wordUrl: packageFiles.tutelaDocx?.downloadUrl || undefined,
              tutelaPdf: packageFiles.tutelaPdf?.downloadUrl || firstItem.downloadUrl || undefined,
              tutelaDocx: packageFiles.tutelaDocx?.downloadUrl || undefined,
            };
          } else if (data.documentType === 'estudiantes') {
            // Para estudiantes: todos los materiales descargables
            files = {
              pdfUrl: firstItem.downloadUrl || packageFiles.studyMaterialPdf?.downloadUrl || packageFiles.templatePdf?.downloadUrl || undefined,
              wordUrl: packageFiles.templateDocx?.downloadUrl || undefined,
              templateDocx: packageFiles.templateDocx?.downloadUrl || undefined,
              templatePdf: packageFiles.templatePdf?.downloadUrl || undefined,
              sampleDocx: packageFiles.sampleDocx?.downloadUrl || undefined,
              samplePdf: packageFiles.samplePdf?.downloadUrl || undefined,
              studyMaterialPdf: packageFiles.studyMaterialPdf?.downloadUrl || undefined,
            };
          } else {
            // Para otros tipos (reclamacion_cantidades, etc.)
            files = {
              pdfUrl: firstItem.downloadUrl || packageFiles.studyMaterialPdf?.downloadUrl || undefined,
              wordUrl: packageFiles.templateDocx?.downloadUrl || undefined,
            };
          }
          
          // Convertir cada purchase a PurchaseHistory
          return {
            id: data.id || doc.id,
            userId: data.userId,
            documentTitle: firstItem.name || 'Documento legal',
            documentType: (data.documentType || 'reclamacion_cantidades') as 'reclamacion_cantidades' | 'accion_tutela' | 'estudiantes',
            purchaseDate: toDate(data.createdAt),
            price: data.total || 0,
            currency: data.currency || 'EUR',
            status: historyStatus,
            documentCount: data.items?.length || 0,
            accuracy: 85, // Default accuracy, puede calcularse si hay datos
            docId: data.docId || firstItem.documentId || undefined,
            files: files,
            emailSent: false, // Puede agregarse si hay tracking
            paid: data.status === 'completed'
          };
        })
        .filter((p) => {
          // Filtrar por documentType si está especificado
          if (documentType) {
            return p.documentType === documentType;
          }
          return true;
        });
      
      // Ordenar por fecha (si no se pudo hacer orderBy en la query)
      formattedData.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
      
      console.log(`✅ Historial cargado desde Firestore: ${formattedData.length} items`);
      
      setPurchaseHistory(formattedData);
      
      // Si no hay documentos, no es un error, solo mostrar mensaje vacío
      if (formattedData.length === 0) {
        console.log('ℹ️ No hay documentos en el historial');
        // No establecer error, solo dejar vacío para mostrar mensaje amigable
      }
    } catch (err: any) {
      console.error('❌ Error obteniendo historial desde Firestore:', err);
      
      // Verificar si es un error de índice faltante (no es crítico, solo significa que no hay datos o falta índice)
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      // Errores que NO deben mostrarse como error al usuario:
      // - failed-precondition: falta índice (común cuando no hay datos)
      // - not-found: no hay documentos
      // - permission-denied: puede ser que no haya permisos pero también puede ser que no haya datos
      const isNonCriticalError = 
        errorCode === 'failed-precondition' || 
        errorCode === 'not-found' ||
        errorMessage.includes('index') ||
        errorMessage.includes('No documents') ||
        errorMessage.includes('JSON') ||
        errorMessage.includes('<!DOCTYPE') ||
        errorMessage.includes('Unexpected token');
      
      if (isNonCriticalError) {
        // No es un error crítico - simplemente no hay documentos o falta índice
        // Esto es normal cuando el usuario no tiene compras aún
        console.log('ℹ️ No hay documentos o falta índice de Firestore (normal para usuarios sin compras)');
        setPurchaseHistory([]);
        setError(null); // NO establecer error - mostrar estado vacío amigable
      } else {
        // Error real que necesita atención (permisos, red, etc.)
        console.error('❌ Error real obteniendo historial:', err);
        setError('No se pudo cargar el historial de compras. Por favor, intenta de nuevo.');
        setPurchaseHistory([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, documentType, db]);

  // Cargar historial al montar y cuando cambie userId
  useEffect(() => {
    fetchPurchaseHistory();
  }, [fetchPurchaseHistory]);

  // Escuchar eventos personalizados para refrescar el historial
  useEffect(() => {
    const handleDocumentGenerated = () => {
      console.log('🔄 Evento de documento generado recibido, refrescando historial...');
      // Esperar un poco para que Firestore se actualice
      setTimeout(() => {
        fetchPurchaseHistory();
      }, 2000);
    };

    const handlePaymentCompleted = () => {
      console.log('💳 Evento de pago completado recibido, refrescando historial...');
      // Esperar un poco para que el webhook procese
      setTimeout(() => {
        fetchPurchaseHistory();
      }, 3000);
    };

    // Escuchar eventos personalizados
    window.addEventListener('document-generated', handleDocumentGenerated);
    window.addEventListener('payment-completed', handlePaymentCompleted);

    // Polling cada 10 segundos para verificar nuevos documentos (solo si hay documentos existentes)
    const pollingInterval = setInterval(() => {
      if (purchaseHistory.length > 0) {
        console.log('🔄 Polling: verificando nuevos documentos...');
        fetchPurchaseHistory();
      }
    }, 10000);

    return () => {
      window.removeEventListener('document-generated', handleDocumentGenerated);
      window.removeEventListener('payment-completed', handlePaymentCompleted);
      clearInterval(pollingInterval);
    };
  }, [fetchPurchaseHistory, purchaseHistory.length]);

  // Filter history based on documentType prop
  const filteredPurchaseHistory = documentType 
    ? purchaseHistory.filter(purchase => purchase.documentType === documentType)
    : purchaseHistory;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Función para descargar desde URL directa (para materiales descargables)
  const downloadFromUrl = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      console.log(`✅ Descargado: ${filename}`);
    } catch (error: any) {
      console.error(`❌ Error descargando ${filename}:`, error);
      alert(`Error descargando el archivo: ${error.message}`);
    }
  }, []);

  const downloadDocument = useCallback(async (doc: PurchaseHistory, format: 'pdf' | 'word') => {
    try {
      // Si hay URL directa disponible, usarla
      if (format === 'pdf' && doc.files.pdfUrl) {
        await downloadFromUrl(doc.files.pdfUrl, `${doc.documentTitle}.pdf`);
        return;
      }
      if (format === 'word' && doc.files.wordUrl) {
        await downloadFromUrl(doc.files.wordUrl, `${doc.documentTitle}.docx`);
        return;
      }

      // Fallback: usar endpoint API si no hay URL directa
      if (!doc.docId) {
        alert('Error: No se encontró el ID del documento');
        return;
      }

      const endpoint = format === 'pdf' 
        ? `/api/documents/${doc.docId}/download?uid=${userId}`
        : `/api/documents/${doc.docId}/word?uid=${userId}`;

      console.log(`📥 Descargando ${format.toUpperCase()}: ${endpoint}`);

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Este código solo puede ejecutarse en el cliente');
      }
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = doc.documentTitle;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      if (format === 'word' && !filename.endsWith('.docx')) {
        filename = filename.replace(/\.pdf$/, '') + '.docx';
      } else if (format === 'pdf' && !filename.endsWith('.pdf')) {
        filename = filename.replace(/\.docx$/, '') + '.pdf';
      }

      const url = window.URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = filename;
      linkElement.style.display = 'none';
      document.body.appendChild(linkElement);
      linkElement.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(linkElement);
        console.log(`✅ ${format.toUpperCase()} descargado: ${filename}`);
      }, 100);
    } catch (error: any) {
      console.error(`❌ Error descargando ${format}:`, error);
      alert(`Error descargando el documento: ${error.message}`);
    }
  }, [userId, downloadFromUrl]);

  const toggleExpand = (purchaseId: string) => {
    setExpandedPurchases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(purchaseId)) {
        newSet.delete(purchaseId);
      } else {
        newSet.add(purchaseId);
      }
      return newSet;
    });
  };

  const downloadInvoice = useCallback(async (purchase: PurchaseHistory) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURA', 105, 20, { align: 'center' });
      
      // Company info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Avocat LegalTech', 20, 35);
      doc.text('Servicios Legales Digitales', 20, 42);
      doc.text('CIF: B12345678', 20, 49);
      doc.text('info@avocatlegaltech.com', 20, 56);
      
      // Invoice details
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURA Nº:', 120, 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`INV-${purchase.id}`, 120, 42);
      
      doc.setFont('helvetica', 'bold');
      doc.text('FECHA:', 120, 49);
      doc.setFont('helvetica', 'normal');
      doc.text(purchase.purchaseDate.toLocaleDateString('es-ES'), 120, 56);
      
      // Line separator
      doc.setLineWidth(0.5);
      doc.line(20, 65, 190, 65);
      
      // Service details
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPCIÓN DEL SERVICIO', 20, 80);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Servicio de Generación de Documentos Legales', 20, 90);
      doc.text(`- ${purchase.documentTitle}`, 30, 100);
      doc.text(`- Documentos procesados: ${purchase.documentCount}`, 30, 107);
      doc.text(`- Precisión del análisis: ${purchase.accuracy}%`, 30, 114);
      
      // Price details
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL:', 150, 100);
      doc.text(`${purchase.price.toFixed(2)} ${purchase.currency}`, 150, 107);
      
      doc.text('IVA (21%):', 150, 120);
      const iva = purchase.price * 0.21;
      doc.text(`${iva.toFixed(2)} ${purchase.currency}`, 150, 127);
      
      doc.setFontSize(14);
      doc.text('TOTAL:', 150, 140);
      const total = purchase.price + iva;
      doc.text(`${total.toFixed(2)} ${purchase.currency}`, 150, 147);
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Gracias por confiar en Avocat LegalTech', 105, 180, { align: 'center' });
      doc.text('Este documento es una factura válida', 105, 187, { align: 'center' });
      
      // Save the invoice
      doc.save(`Factura-${purchase.id}-${purchase.purchaseDate.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  }, []);

  const viewPdf = useCallback((doc: PurchaseHistory) => {
    setSelectedDocument(doc);
    setShowPdfViewer(true);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Historial de Compras
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Gestiona y descarga tus documentos generados anteriormente
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documentos
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precisión
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              {documentType === 'reclamacion_cantidades' && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad Reclamada
                </th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPurchaseHistory.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        purchase.documentType === 'accion_tutela' 
                          ? 'bg-red-100' 
                          : 'bg-orange-100'
                      }`}>
                        <svg className={`h-5 w-5 ${
                          purchase.documentType === 'accion_tutela' 
                            ? 'text-red-600' 
                            : 'text-orange-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {purchase.documentTitle}
                      </div>
                      <div className="text-xs text-gray-500">
                        {purchase.documentType}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {purchase.purchaseDate.toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {purchase.documentCount} archivos
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-sm font-medium ${getAccuracyColor(purchase.accuracy)}`}>
                    {purchase.accuracy}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {purchase.price} {purchase.currency}
                </td>
                {documentType === 'reclamacion_cantidades' && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {purchase.amountClaimed ? `€${purchase.amountClaimed.toFixed(2)}` : 'N/A'}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchase.status)}`}>
                    {purchase.status === 'completed' ? 'Completado' : 
                     purchase.status === 'pending' ? 'Pendiente' : 'Fallido'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-1">
                    {purchase.status === 'completed' ? (
                      <>
                        <button
                          onClick={() => viewPdf(purchase)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Ver PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => downloadDocument(purchase, 'pdf')}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Descargar PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => downloadDocument(purchase, 'word')}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Descargar Word"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => downloadInvoice(purchase)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                          title="Descargar Factura"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic" title="Pago pendiente - Las acciones estarán disponibles después del pago">
                        Pago pendiente
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredPurchaseHistory.map((purchase) => (
          <div key={purchase.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Header with icon and title */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center flex-1 min-w-0">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    purchase.documentType === 'accion_tutela' 
                      ? 'bg-red-100' 
                      : 'bg-orange-100'
                  }`}>
                    <svg className={`h-6 w-6 ${
                      purchase.documentType === 'accion_tutela' 
                        ? 'text-red-600' 
                        : 'text-orange-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {purchase.documentTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {purchase.documentType}
                  </p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchase.status)}`}>
                {purchase.status === 'completed' ? 'Completado' : 
                 purchase.status === 'pending' ? 'Pendiente' : 'Fallido'}
              </span>
            </div>

            {/* Details Grid */}
            <div className={`grid gap-3 mb-4 ${documentType === 'reclamacion_cantidades' ? 'grid-cols-2' : 'grid-cols-2'}`}>
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="text-sm font-medium text-gray-900">
                  {purchase.purchaseDate.toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Precio</p>
                <p className="text-sm font-medium text-gray-900">
                  {purchase.price} {purchase.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Documentos</p>
                <p className="text-sm font-medium text-gray-900">
                  {purchase.documentCount} archivos
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Precisión</p>
                <p className={`text-sm font-medium ${getAccuracyColor(purchase.accuracy)}`}>
                  {purchase.accuracy}%
                </p>
              </div>
              {documentType === 'reclamacion_cantidades' && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Cantidad Reclamada</p>
                  <p className="text-sm font-medium text-gray-900">
                    {purchase.amountClaimed ? `€${purchase.amountClaimed.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {purchase.status === 'completed' ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => viewPdf(purchase)}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Ver documento</span>
                  </button>
                  <button
                    onClick={() => downloadDocument(purchase, 'pdf')}
                    className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Descargar</span>
                  </button>
                </div>

                {/* Materiales descargables - Sección expandible */}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <button
                    onClick={() => toggleExpand(purchase.id)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Materiales descargables
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${expandedPurchases.has(purchase.id) ? 'transform rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedPurchases.has(purchase.id) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      {purchase.documentType === 'estudiantes' ? (
                        <>
                          {purchase.files.templateDocx && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.templateDocx!, `${purchase.documentTitle}_Plantilla.docx`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Plantilla (Word)
                              </span>
                              <span className="text-xs text-gray-500">.docx</span>
                            </button>
                          )}
                          {purchase.files.templatePdf && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.templatePdf!, `${purchase.documentTitle}_Plantilla.pdf`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Plantilla (PDF)
                              </span>
                              <span className="text-xs text-gray-500">.pdf</span>
                            </button>
                          )}
                          {purchase.files.sampleDocx && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.sampleDocx!, `${purchase.documentTitle}_Ejemplo.docx`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Ejemplo (Word)
                              </span>
                              <span className="text-xs text-gray-500">.docx</span>
                            </button>
                          )}
                          {purchase.files.samplePdf && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.samplePdf!, `${purchase.documentTitle}_Ejemplo.pdf`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Ejemplo (PDF)
                              </span>
                              <span className="text-xs text-gray-500">.pdf</span>
                            </button>
                          )}
                          {purchase.files.studyMaterialPdf && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.studyMaterialPdf!, `${purchase.documentTitle}_Dossier.pdf`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Dossier académico (PDF)
                              </span>
                              <span className="text-xs text-gray-500">.pdf, ≥ 3 páginas</span>
                            </button>
                          )}
                        </>
                      ) : purchase.documentType === 'accion_tutela' ? (
                        <>
                          {purchase.files.tutelaDocx && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.tutelaDocx!, `${purchase.documentTitle}.docx`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Acción de Tutela (Word)
                              </span>
                              <span className="text-xs text-gray-500">.docx</span>
                            </button>
                          )}
                          {purchase.files.tutelaPdf && (
                            <button
                              onClick={() => downloadFromUrl(purchase.files.tutelaPdf!, `${purchase.documentTitle}.pdf`)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-green-100 rounded-md text-sm text-gray-700 transition-colors flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Acción de Tutela (PDF)
                              </span>
                              <span className="text-xs text-gray-500">.pdf</span>
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                    <span>Total: {purchase.price} {purchase.currency} • {purchase.documentCount} documento{purchase.documentCount !== 1 ? 's' : ''}</span>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => downloadInvoice(purchase)}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Descargar Factura
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                <p className="text-xs text-yellow-800">
                  <strong>Pago pendiente</strong> - Las acciones estarán disponibles después del pago
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PDF Viewer Modal */}
      {showPdfViewer && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate pr-4">
                {selectedDocument.documentTitle}
              </h3>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Documentos subidos */}
              {selectedDocument.uploadedDocuments && selectedDocument.uploadedDocuments.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">📄 Documentos subidos ({selectedDocument.uploadedDocuments.length}):</h4>
                  <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    {selectedDocument.uploadedDocuments.map((docName, index) => (
                      <li key={index}>{docName}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Contenido del documento */}
              {selectedDocument.documentContent ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">📋 Contenido del documento:</h4>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded border overflow-x-auto">
                      {selectedDocument.documentContent}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-4 sm:p-8 text-center mb-4">
                  <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Vista Previa del PDF</h4>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    {selectedDocument.documentTitle}
                  </p>
                </div>
              )}
              
              {/* Document Details - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-gray-500 mb-6">
                <div className="bg-white rounded-md p-3">
                  <p className="font-medium text-gray-700">Fecha de compra</p>
                  <p className="text-gray-900">{selectedDocument.purchaseDate.toLocaleDateString('es-ES')}</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="font-medium text-gray-700">Documentos procesados</p>
                  <p className="text-gray-900">{selectedDocument.documentCount}</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="font-medium text-gray-700">Precisión</p>
                  <p className={`font-medium ${getAccuracyColor(selectedDocument.accuracy)}`}>
                    {selectedDocument.accuracy}%
                  </p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="font-medium text-gray-700">Precio</p>
                  <p className="text-gray-900">{selectedDocument.price} {selectedDocument.currency}</p>
                </div>
              </div>
              
              {/* Action Buttons - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <button
                  onClick={() => downloadDocument(selectedDocument, 'pdf')}
                  className="bg-orange-600 text-white hover:bg-orange-700 px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => downloadDocument(selectedDocument, 'word')}
                  className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar Word</span>
                </button>
                <button
                  onClick={() => downloadInvoice(selectedDocument)}
                  className="bg-green-600 text-white hover:bg-green-700 px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar Factura</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Totals Section */}
      {filteredPurchaseHistory.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Total</h3>
          <div className={`grid gap-6 ${documentType === 'reclamacion_cantidades' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Total de Precios</h4>
              <p className="text-2xl font-bold text-gray-900">
                €{filteredPurchaseHistory.reduce((total, purchase) => total + purchase.price, 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {filteredPurchaseHistory.length} documento{filteredPurchaseHistory.length !== 1 ? 's' : ''}
              </p>
            </div>
            {documentType === 'reclamacion_cantidades' && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Reclamado</h4>
                <p className="text-2xl font-bold text-green-600">
                  €{filteredPurchaseHistory
                    .filter(purchase => purchase.amountClaimed)
                    .reduce((total, purchase) => total + (purchase.amountClaimed || 0), 0)
                    .toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredPurchaseHistory.filter(purchase => purchase.amountClaimed).length} reclamación{filteredPurchaseHistory.filter(purchase => purchase.amountClaimed).length !== 1 ? 'es' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Cargando historial...</p>
        </div>
      )}

      {/* Empty State - Mostrar cuando no hay documentos (NO es un error) */}
      {!loading && !error && filteredPurchaseHistory.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {documentType === 'accion_tutela' 
              ? 'No hay acciones de tutela generadas'
              : documentType === 'reclamacion_cantidades'
              ? 'No hay reclamaciones de cantidades generadas'
              : 'No hay documentos en tu historial'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {documentType === 'accion_tutela'
              ? 'Genera tu primera acción de tutela para verla aquí'
              : documentType === 'reclamacion_cantidades'
              ? 'Genera tu primera reclamación de cantidades para verla aquí'
              : 'Tus documentos generados aparecerán aquí una vez que completes una compra'}
          </p>
        </div>
      )}

      {/* Error State - Solo mostrar errores REALES (problemas de red, permisos, etc.) */}
      {error && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar historial</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      )}
    </div>
  );
}
