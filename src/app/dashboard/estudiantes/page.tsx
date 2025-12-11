'use client';

import { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
import type { Purchase } from '@/types/purchase';
// import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Data structure for legal areas and document types with pricing
const legalAreas = {
  'Derecho Constitucional': [
    { name: 'Recurso de amparo ante el Tribunal Constitucional', price: 3.00 },
    { name: 'Recurso de inconstitucionalidad (modelo orientativo)', price: 3.00 },
    { name: 'Escrito de acción de protección de derechos fundamentales (ej. derecho de reunión, libertad de expresión)', price: 3.00 }
  ],
  'Derecho Civil y Procesal Civil': [
    { name: 'Demanda de reclamación de cantidad (juicio ordinario / juicio verbal / monitorio)', price: 3.00 },
    { name: 'Escrito de oposición a juicio monitorio', price: 3.00 },
    { name: 'Demanda de desahucio por falta de pago', price: 3.00 },
    { name: 'Escrito de medidas cautelares', price: 3.00 },
    { name: 'Recurso de apelación en proceso civil', price: 3.00 },
    { name: 'Demanda de responsabilidad contractual / extracontractual', price: 3.00 },
    { name: 'Escrito de ejecución de sentencia (ej. embargo de bienes)', price: 3.00 }
  ],
  'Derecho Penal y Procesal Penal': [
    { name: 'Denuncia y querella criminal', price: 3.00 },
    { name: 'Escrito de acusación particular', price: 3.00 },
    { name: 'Escrito de defensa', price: 3.00 },
    { name: 'Solicitud de medidas cautelares (ej. prisión preventiva, alejamiento)', price: 3.00 },
    { name: 'Recurso de reforma y subsidiario de apelación', price: 3.00 },
    { name: 'Escrito de personación como acusación particular', price: 3.00 },
    { name: 'Recurso de casación penal (modelo académico)', price: 3.00 }
  ],
  'Derecho Laboral (Jurisdicción Social)': [
    { name: 'Demanda por despido improcedente', price: 3.00 },
    { name: 'Demanda por reclamación de salarios', price: 3.00 },
    { name: 'Demanda por modificación sustancial de condiciones de trabajo', price: 3.00 },
    { name: 'Escrito de impugnación de sanción disciplinaria', price: 3.00 },
    { name: 'Escrito de ejecución de sentencia laboral', price: 3.00 }
  ],
  'Derecho Administrativo y Contencioso-Administrativo': [
    { name: 'Recurso administrativo de alzada', price: 3.00 },
    { name: 'Recurso potestativo de reposición', price: 3.00 },
    { name: 'Demanda contencioso-administrativa', price: 3.00 },
    { name: 'Medidas cautelares en vía contenciosa', price: 3.00 },
    { name: 'Escrito de personación en procedimiento contencioso', price: 3.00 },
    { name: 'Recurso de apelación en lo contencioso-administrativo', price: 3.00 }
  ],
  'Derecho Mercantil': [
    { name: 'Demanda de impugnación de acuerdos sociales', price: 3.00 },
    { name: 'Solicitud de concurso voluntario', price: 3.00 },
    { name: 'Demanda por competencia desleal', price: 3.00 },
    { name: 'Demanda por incumplimiento contractual mercantil', price: 3.00 },
    { name: 'Demanda cambiaria (ejecutiva)', price: 3.00 }
  ],
  'Recursos procesales transversales': [
    { name: 'Recurso de reposición', price: 3.00 },
    { name: 'Recurso de apelación', price: 3.00 },
    { name: 'Recurso de casación', price: 3.00 },
    { name: 'Recurso de queja', price: 3.00 },
    { name: 'Incidente de nulidad de actuaciones', price: 3.00 }
  ],
  'Derecho de Familia': [
    { name: 'Demanda de divorcio contencioso', price: 3.00 },
    { name: 'Demanda de medidas paternofiliales', price: 3.00 },
    { name: 'Solicitud de modificación de medidas', price: 3.00 },
    { name: 'Solicitud de guarda y custodia', price: 3.00 },
    { name: 'Demanda de alimentos', price: 3.00 },
    { name: 'Escrito de ejecución por impago de pensión alimenticia', price: 3.00 }
  ]
};

const DEFAULT_COUNTRY = 'España' as const;

// Cart item interface
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  area: string;
  country?: string;
}

interface PurchaseDocument {
  id: string;
  name: string;
  price: number;
  quantity: number;
  area?: string;
  country?: string;
  documentId?: string | null;
  downloadUrl?: string | null;
  previewUrl?: string;
  storagePath?: string | null;
  fileType?: string;
  packageId?: string;
  packageFiles?: {
    templateDocx?: GeneratedPackageFile;
    templatePdf?: GeneratedPackageFile;
    sampleDocx?: GeneratedPackageFile;
    samplePdf?: GeneratedPackageFile;
    studyMaterialPdf?: GeneratedPackageFile;
  };
}

// Note: Purchase type is imported from @/types/purchase
// Local PurchaseDocument interface (for UI display) - extends PurchaseItem from unified type

interface GeneratedPackageFile {
  path: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  token?: string;
}

// Helper function to convert Timestamp | Date to Date
const toDate = (value: Date | Timestamp | undefined | null): Date => {
  if (!value) return new Date();
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as any);
};

function EstudiantesDashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [selectedLegalArea, setSelectedLegalArea] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const selectedCountry = DEFAULT_COUNTRY;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [documentActionLoadingId, setDocumentActionLoadingId] = useState<string | null>(null);
  const [documentUrlCache, setDocumentUrlCache] = useState<Record<string, string>>({});
  const [purchaseReloadToken, setPurchaseReloadToken] = useState(0);
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const euroFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }),
    []
  );

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    if (currency === 'EUR') {
      return euroFormatter.format(amount);
    }

    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const coerceNumber = (value: unknown, fallback = 0) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  };

  const parseFirestoreDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch {
        // ignore fallthrough
      }
    }
    if (typeof value === 'object' && 'seconds' in value) {
      return new Date(value.seconds * 1000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  };

  const purchaseSummary = useMemo(() => {
    const currency = purchaseHistory[0]?.currency ?? 'EUR';
    const totalSpent = purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalDocuments = purchaseHistory.reduce(
      (sum, purchase) => sum + purchase.items.length,
      0
    );

    return {
      currency,
      totalSpent,
      totalDocuments,
      count: purchaseHistory.length
    };
  }, [purchaseHistory]);

  // Create a payment intent record and send user to Stripe Checkout Session
  const handleProceedToPayment = async () => {
    if (!user || cart.length === 0) return;

    try {
      const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

      // Debug logs removed for production

      // Create checkout session with multiple line items
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            name: item.name,
            price: Math.round(item.price * 100), // Convert to cents
            quantity: item.quantity,
            area: item.area,
            country: item.country ?? selectedCountry
          })),
          documentType: 'estudiantes', // ⭐ NUEVO: Especificar documentType explícitamente
          customerEmail: user.email,
          userId: user.uid,
          successUrl: `${window.location.origin}/dashboard/estudiantes?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard/estudiantes?payment=cancelled`
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        console.error('Error creating checkout session');
        alert('Error al procesar el pago. Inténtalo de nuevo.');
      }
    } catch (e) {
      console.error('Error preparing Stripe checkout:', e);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
    }
  };

  const getDocumentUrl = async (item: PurchaseDocument | any): Promise<string | null> => {
    if (!item) {
      return null;
    }

    const cachedUrl = documentUrlCache[item.id];
    if (cachedUrl) {
      return cachedUrl;
    }

    const registerUrl = (url: string | null) => {
      if (url) {
        setDocumentUrlCache((prev) => ({ ...prev, [item.id]: url }));
      }
      return url;
    };

    if (item.packageFiles?.studyMaterialPdf?.downloadUrl) {
      return registerUrl(item.packageFiles.studyMaterialPdf.downloadUrl);
    }

    if (item.downloadUrl) {
      return registerUrl(item.downloadUrl);
    }

    if (item.previewUrl) {
      return registerUrl(item.previewUrl);
    }

    if (item.storagePath && storage) {
      try {
        const url = await getDownloadURL(ref(storage, item.storagePath));
        return registerUrl(url);
      } catch (error) {
        console.error('Error obteniendo URL desde storage:', error);
      }
    }

    if (item.documentId && db) {
      try {
        const documentRef = doc(db, 'documents', item.documentId);
        const documentSnap = await getDoc(documentRef);

        if (documentSnap.exists()) {
          const documentData = documentSnap.data() as any;
          const potentialUrls = [
            documentData.pdfUrl,
            documentData.wordUrl,
            documentData.fileUrl,
            documentData.downloadUrl,
            documentData.storage?.downloadUrl
          ].filter(Boolean);

          let resolvedUrl = potentialUrls[0];

          if (!resolvedUrl && documentData.storage?.storagePath && storage) {
            resolvedUrl = await getDownloadURL(ref(storage, documentData.storage.storagePath));
          }

          if (resolvedUrl) {
            return registerUrl(resolvedUrl);
          }
        }
      } catch (error) {
        console.error('Error obteniendo documento relacionado:', error);
      }
    }

    if (item.storagePath && storage) {
      try {
        const url = await getDownloadURL(ref(storage, item.storagePath));
        return registerUrl(url);
      } catch (error) {
        console.error('Error obteniendo URL desde storage:', error);
      }
    }

    return null;
  };

  const handleDownloadDocument = async (item: PurchaseDocument | any) => {
    setDocumentActionLoadingId(item.id);
    try {
      const url = await getDocumentUrl(item);
      if (!url) {
        alert('No se encontró un enlace de descarga para este documento.');
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = `${item.name.replace(/\s+/g, '_')}.${item.fileType || 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar el documento:', error);
      alert('Ocurrió un error al intentar descargar el documento.');
    } finally {
      setDocumentActionLoadingId(null);
    }
  };

  const handleViewDocument = async (item: PurchaseDocument | any) => {
    setDocumentActionLoadingId(item.id);
    try {
      const url = await getDocumentUrl(item);
      if (!url) {
        alert('No se encontró un enlace para visualizar este documento.');
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error al abrir el documento:', error);
      alert('Ocurrió un error al intentar abrir el documento.');
    } finally {
      setDocumentActionLoadingId(null);
    }
  };

  // Function to generate and download invoice
  const downloadInvoice = (purchase: Purchase) => {
    const invoiceContent = generateInvoiceContent(purchase);
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const invoiceDate = toDate(purchase.createdAt).toISOString().split('T')[0];
    link.download = `factura_${purchase.id}_${invoiceDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Function to generate invoice HTML content
  const generateInvoiceContent = (purchase: Purchase) => {
    const currentDate = new Date().toLocaleDateString('es-ES');
    const purchaseDate = toDate(purchase.createdAt).toLocaleDateString('es-ES');
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${purchase.id} - Avocat LegalTech</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .invoice-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background: #10b981;
            color: white;
            font-weight: bold;
        }
        .items-table tr:nth-child(even) {
            background: #f9fafb;
        }
        .total-section {
            text-align: right;
            margin-top: 20px;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background: #dcfce7;
            color: #166534;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏛️ Avocat LegalTech</div>
        <h1>FACTURA</h1>
        <p>Plataforma de Documentos Legales para Estudiantes</p>
    </div>

    <div class="invoice-info">
        <div>
            <h3>Información de la Factura</h3>
            <p><strong>Número de Factura:</strong> ${purchase.id}</p>
            <p><strong>Fecha de Emisión:</strong> ${currentDate}</p>
            <p><strong>Fecha de Compra:</strong> ${purchaseDate}</p>
            <p><strong>Estado:</strong> <span class="status-badge">✅ Completada</span></p>
        </div>
        <div>
            <h3>Cliente</h3>
            <p><strong>Email:</strong> ${user?.email || 'estudiante@ejemplo.com'}</p>
            <p><strong>Tipo:</strong> Estudiante</p>
            <p><strong>Plataforma:</strong> Avocat LegalTech</p>
        </div>
    </div>

    <div class="invoice-details">
        <h3>Detalles de la Compra</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Documento</th>
                    <th>Área Legal</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${purchase.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.area || 'General'}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price, purchase.currency)}</td>
                        <td>${formatCurrency(item.price * item.quantity, purchase.currency)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="total-section">
        <p><strong>Subtotal:</strong> ${formatCurrency(purchase.total, purchase.currency)}</p>
        <p><strong>IVA (0%):</strong> ${formatCurrency(0, purchase.currency)}</p>
        <div class="total-amount">Total: ${formatCurrency(purchase.total, purchase.currency)}</div>
    </div>

    <div class="footer">
        <p><strong>Avocat LegalTech</strong> - Plataforma de Documentos Legales</p>
        <p>Gracias por confiar en nosotros para tus estudios jurídicos</p>
        <p>Esta factura ha sido generada automáticamente el ${currentDate}</p>
    </div>
</body>
</html>`;
  };

  useEffect(() => {
    // Add global error handler for runtime errors
    const handleRuntimeError = (event: ErrorEvent) => {
      console.warn('Caught runtime error:', event.error);
      // Don't let runtime errors affect auth state
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Caught unhandled promise rejection:', event.reason);
      // Don't let promise rejections affect auth state
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
    if (!authChecked || !isFirebaseReady) {
      return;
    }

    if (user) {
      return;
    }

    const currentUser = (auth as Auth | null)?.currentUser;
    if (currentUser) {
      setUser(currentUser);
      return;
    }

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 400);

    return () => clearTimeout(timer);
  }, [authChecked, isFirebaseReady, user, router]);

  useEffect(() => {
    const loadPurchases = async () => {
      if (!user) {
        setPurchaseHistory([]);
        return;
      }

      if (!db) {
        console.warn('Firestore no está disponible en el cliente.');
        return;
      }

      setPurchaseLoading(true);
      setPurchaseError(null);

      try {
        const purchasesCollection = collection(db, 'purchases');
        let purchasesQuery;

        try {
          purchasesQuery = query(
            purchasesCollection,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        } catch (error) {
          console.warn('No se pudo aplicar orderBy en compras, usando consulta básica.', error);
          purchasesQuery = query(purchasesCollection, where('userId', '==', user.uid));
        }

        const snapshot = await getDocs(purchasesQuery);

        const purchases: Purchase[] = snapshot.docs.map((purchaseSnapshot) => {
          const data = purchaseSnapshot.data();

          const rawItems = Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.documents)
            ? data.documents
            : data.item
            ? [
                {
                  id: data.metadata?.documentId || `${purchaseSnapshot.id}-item`,
                  name: data.item,
                  price: data.price ?? data.amount ?? 0,
                  quantity: data.quantity ?? 1,
                  area: data.area,
                  documentId: data.metadata?.documentId,
                  downloadUrl: data.metadata?.downloadUrl ?? data.downloadUrl ?? data.pdfUrl
                }
              ]
            : [];

          // Map to PurchaseItem structure (compatible with PurchaseDocument for UI)
          const normalizedItems = rawItems.map((item: any, index: number) => ({
            id: item.id || item.documentId || `${purchaseSnapshot.id}-item-${index}`,
            name: item.name || item.title || item.documentTitle || 'Documento legal',
            area: item.area || item.category || item.legalArea || '',
            country: item.country || data.country || DEFAULT_COUNTRY,
            price: coerceNumber(
              item.price ?? item.amount ?? item.total ?? data.price ?? data.amount ?? data.total
            ),
            quantity: coerceNumber(item.quantity ?? item.count ?? 1, 1),
            status: (item.status || 'completed') as 'pending' | 'completed' | 'failed',
            documentType: item.documentType || data.documentType || 'estudiantes',
            documentId: item.documentId || item.docId || item.id || null,
            downloadUrl: item.downloadUrl || item.pdfUrl || item.fileUrl || null,
            storagePath: item.storagePath || item.storagePathPdf || item.storage?.path || null,
            packageFiles: item.packageFiles,
            documents: item.documents || [],
            error: item.error,
            tutelaId: item.tutelaId || data.tutelaId,
            docId: item.docId || data.docId,
            formData: item.formData || data.formData,
            // Additional UI fields (not in PurchaseItem but used by UI)
            previewUrl: item.previewUrl || item.viewerUrl,
            fileType: item.fileType || item.format || item.type,
            packageId: item.packageId || item.documentPackageId,
          }));

          const totalFromData = coerceNumber(
            data.total ?? data.amount ?? data.price ?? data.summary?.total ?? data.summary?.amount
          );

          const totalCalculated =
            normalizedItems.length > 0
              ? normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
              : totalFromData;

          // Map to unified Purchase structure
          return {
            id: purchaseSnapshot.id,
            userId: data.userId || user?.uid || 'unknown',
            customerEmail: data.customerEmail || data.email || user?.email || '',
            createdAt: parseFirestoreDate(
              data.createdAt ?? data.purchaseDate ?? data.timestamp ?? data.date
            ),
            updatedAt: parseFirestoreDate(
              data.updatedAt ?? data.createdAt ?? data.purchaseDate ?? data.timestamp ?? data.date
            ),
            status: (data.status || 'completed') as Purchase['status'],
            total: totalCalculated,
            currency: data.currency || 'EUR',
            paymentMethod: data.paymentMethod,
            items: normalizedItems as any, // Type assertion: normalizedItems extends PurchaseItem with additional UI fields
            documentType: data.documentType || 'estudiantes', // Default to estudiantes for backward compatibility
            source: (data.source || (data.stripeSessionId ? 'stripe_webhook' : 'manual')) as Purchase['source'],
            stripeSessionId: data.stripeSessionId,
            stripePaymentIntentId: data.stripePaymentIntentId,
            documentsGenerated: data.documentsGenerated ?? 0,
            documentsFailed: data.documentsFailed ?? 0,
            webhookProcessedAt: data.webhookProcessedAt ? parseFirestoreDate(data.webhookProcessedAt) : undefined,
            tutelaId: data.tutelaId,
            docId: data.docId,
            formData: data.formData,
            orderId: data.orderId || data.client_reference_id,
            metadata: data.metadata || {}
          } as Purchase;
        });

        // Filter out pending purchases that don't have documents generated
        // Purchases should only appear after successful payment (status: 'completed')
        const validPurchases = purchases.filter((purchase) => {
          // Only show completed purchases, or pending purchases that have documents
          if (purchase.status === 'completed') {
            return true;
          }
          
          // For pending purchases, only show if they have documents generated
          if (purchase.status === 'pending') {
            const hasDocuments = purchase.items.some((item) => 
              item.packageFiles?.studyMaterialPdf?.downloadUrl ||
              item.packageFiles?.templatePdf?.downloadUrl ||
              item.packageFiles?.samplePdf?.downloadUrl ||
              item.downloadUrl ||
              item.storagePath
            );
            return hasDocuments;
          }
          
          // Show other statuses (failed, cancelled, etc.) for transparency
          return true;
        });

        validPurchases.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
        setPurchaseHistory(validPurchases);
      } catch (error) {
        console.error('Error obteniendo el historial de compras:', error);
        setPurchaseError('No se pudo cargar el historial de compras. Inténtalo de nuevo.');
      } finally {
        setPurchaseLoading(false);
      }
    };

    loadPurchases();
  }, [user, db, purchaseReloadToken]);

  // Polling function - checks purchase status and updates UI
  const pollPurchaseStatus = async (purchaseId?: string | null) => {
    if (!user || !db) {
      return false; // Return false if polling should continue
    }
    
    try {
      const purchasesRef = collection(db, 'purchases');
      let q;
      let purchaseDoc;
      
      // If we have a specific purchase ID, query by it
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
        // Otherwise, get the most recent purchase for this user
        try {
          q = query(
            purchasesRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            return false;
          }
          
          purchaseDoc = snapshot.docs[0];
        } catch (error) {
          // Fallback: try without orderBy
          console.warn('orderBy failed, trying without it:', error);
          try {
            q = query(
              purchasesRef,
              where('userId', '==', user.uid)
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
      
      // Also check item statuses as a fallback
      const items = purchaseData.items || [];
      const completedItems = items.filter((item: any) => item.status === 'completed').length;
      const failedItems = items.filter((item: any) => item.status === 'failed').length;
      const hasPackageFiles = items.some((item: any) => item.packageFiles && Object.keys(item.packageFiles).length > 0);
      
      // Documents are ready if:
      // 1. documentsGenerated > 0 (webhook updated the counter), OR
      // 2. All items have status 'completed' or 'failed', OR
      // 3. Items have packageFiles (documents were generated)
      const allItemsProcessed = (completedItems + failedItems) === totalItems && totalItems > 0;
      const documentsReady = documentsGenerated > 0 || allItemsProcessed || hasPackageFiles;
      
      // Show progress if we have partial completion
      if (documentsGenerated > 0 && documentsGenerated < totalItems) {
        // Keep showing processing but with progress info
        setProcessingStatus('processing');
      }
      
      if (documentsReady) {
        // Determine final status
        const finalStatus = (documentsGenerated > 0 || completedItems > 0 || hasPackageFiles) ? 'completed' : 'failed';
        
        // Update status immediately
        setProcessingStatus(finalStatus);
        setPurchaseReloadToken(prev => prev + 1); // Reload purchases
        
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
        
        return true; // Polling complete
      }
      
      // Increment attempts counter
      setPollingAttempts(prev => prev + 1);
      
      // Continue polling (return false)
      return false;
    } catch (error) {
      console.error('Error polling purchase status:', error);
      // Continue polling even on error (might be transient)
      setPollingAttempts(prev => prev + 1);
      return false;
    }
  };

  // Start polling with a specific purchase ID or find the most recent pending purchase
  const startPolling = (purchaseId?: string | null) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setPollingAttempts(0);
    setProcessingStatus('processing');
    setShowPaymentSuccess(true);
    
    let attempts = 0;
    const MAX_ATTEMPTS = 200; // 200 attempts × 3 seconds = 10 minutes
    
    // Poll immediately after a short delay to allow webhook to process
    const initialTimeout = setTimeout(() => {
      pollPurchaseStatus(purchaseId);
      
      // Then poll every 3 seconds
      pollingIntervalRef.current = setInterval(async () => {
        attempts++;
        setPollingAttempts(attempts);
        
        const isComplete = await pollPurchaseStatus(purchaseId);
        
        // Stop if complete or max attempts reached
        if (isComplete || attempts >= MAX_ATTEMPTS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          if (attempts >= MAX_ATTEMPTS && !isComplete) {
            // Timeout reached, check one more time before giving up
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

  // Check for payment success and start polling for document generation
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    
    if (paymentStatus === 'success') {
      // Track subscription success conversion
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'subscribe_success', {});
        window.gtag('event', 'conversion', {
          'send_to': 'AW-16479671897/8Q-oCPbm0bgbENmsj719'
        });
      }
      
      // Remove query parameter from URL (but keep the state)
      router.replace('/dashboard/estudiantes', { scroll: false });
      
      // Only start polling if user is loaded
      if (user && db) {
        startPolling();
      }
    }
    
    if (paymentStatus === 'cancelled') {
      // Show cancellation message
      alert('Pago cancelado. Puedes intentar de nuevo cuando estés listo.');
      router.replace('/dashboard/estudiantes', { scroll: false });
    }
  }, [searchParams, user, db, router]);

  // Persistent polling: Check for pending purchases on page load
  useEffect(() => {
    if (!user || !db || !authChecked || !isFirebaseReady) {
      return;
    }
    
    // Only start persistent polling if we're not already polling
    if (pollingIntervalRef.current) {
      return;
    }
    
    // Check for pending purchases
    const checkPendingPurchases = async () => {
      if (!db) {
        return;
      }
      
      try {
        const purchasesRef = collection(db, 'purchases');
        
        // Get all purchases for this user and filter client-side
        // (More reliable than using 'in' operator which requires index)
        const allPurchasesQuery = query(
          purchasesRef,
          where('userId', '==', user.uid)
        );
        
        const allSnapshot = await getDocs(allPurchasesQuery);
        const pendingPurchases = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          const status = data.status;
          const documentsGenerated = data.documentsGenerated ?? 0;
          const totalItems = data.items?.length || 0;
          const items = data.items || [];
          const hasPackageFiles = items.some((item: any) => item.packageFiles && Object.keys(item.packageFiles).length > 0);
          
          // Consider pending if:
          // 1. Status is pending/processing, OR
          // 2. Documents are not yet complete (documentsGenerated < totalItems and no packageFiles)
          return (status === 'pending' || status === 'processing' || 
                  (documentsGenerated < totalItems && !hasPackageFiles && totalItems > 0));
        });
        
        if (pendingPurchases.length > 0) {
          // Sort by createdAt to get most recent
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
          
          // Double-check that documents are actually still being generated
          const documentsGenerated = purchaseData.documentsGenerated ?? 0;
          const totalItems = purchaseData.items?.length || 0;
          const items = purchaseData.items || [];
          const hasPackageFiles = items.some((item: any) => item.packageFiles && Object.keys(item.packageFiles).length > 0);
          
          // Only start polling if documents are not yet complete
          if (documentsGenerated < totalItems && !hasPackageFiles) {
            console.log('Found pending purchase, starting polling:', purchaseId);
            startPolling(purchaseId);
          }
        }
      } catch (error) {
        console.error('Error checking for pending purchases:', error);
      }
    };
    
    // Check after a short delay to allow initial load
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
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat - Estudiantes</span>
            </div>
            
            <UserMenu user={user} currentPlan="Estudiantes" />
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Estudiantes" user={user} />

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
                    ¡Pago exitoso! Generando tus documentos...
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Estamos procesando tu compra y generando los documentos. Esto puede tardar unos minutos.</p>
                    <p className="mt-1 text-xs text-blue-600">Por favor, no cierres esta página. Te notificaremos cuando estén listos.</p>
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
                    ¡Documentos generados exitosamente!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Tus documentos están listos. Puedes encontrarlos en tu historial de compras a continuación.</p>
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
                    Error al generar documentos
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Hubo un problema al generar tus documentos. Por favor, contacta con soporte o intenta realizar otra compra.</p>
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
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              <strong>Dashboard de Estudiantes</strong> - Plataforma de aprendizaje legal para estudiantes de derecho
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Panel de Estudiante
          </h1>

          {/* Welcome Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                ¡Bienvenido a Avocat para Estudiantes!
              </h3>
              <p className="text-sm text-gray-600">
                Tu plataforma de aprendizaje legal con herramientas de IA para complementar tus estudios jurídicos.
              </p>
            </div>
          </div>


          {/* Legal Document Selection Area */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Selección de Documento Legal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Legal Area Selection */}
                <div>
                  <label htmlFor="legal-area" className="block text-sm font-medium text-gray-700 mb-2">
                    Área Legal
                  </label>
                  <select
                    id="legal-area"
                    value={selectedLegalArea}
                    onChange={(e) => {
                      setSelectedLegalArea(e.target.value);
                      setSelectedDocumentType(''); // Reset document type when area changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Selecciona un área legal</option>
                    {Object.keys(legalAreas).map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Type Selection */}
                <div>
                  <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Escrito
                  </label>
                  <select
                    id="document-type"
                    value={selectedDocumentType}
                    onChange={(e) => {
                      setSelectedDocumentType(e.target.value);
                    }}
                    disabled={!selectedLegalArea}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedLegalArea ? 'Selecciona un tipo de escrito' : 'Primero selecciona un área legal'}
                    </option>
                    {selectedLegalArea && legalAreas[selectedLegalArea as keyof typeof legalAreas]?.map((docType) => (
                      <option key={docType.name} value={docType.name}>
                        {docType.name} - €{docType.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

              {/* Country Information */}
                <div className="md:col-span-2">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    País / Jurisdicción
                  </label>
                <div
                  id="country"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700"
                >
                  {selectedCountry}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Actualmente generamos automáticamente los materiales adaptados a la legislación española.
                </p>
                </div>
              </div>

              {/* Add to Cart Button */}
              {selectedLegalArea && selectedDocumentType && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => {
                    const selectedDoc = legalAreas[selectedLegalArea as keyof typeof legalAreas]?.find(
                      doc => doc.name === selectedDocumentType
                    );
                    if (selectedDoc) {
                      const existingItem = cart.find(item => item.name === selectedDoc.name);
                      if (existingItem) {
                        setCart(
                          cart.map(item =>
                            item.name === selectedDoc.name
                              ? { ...item, quantity: item.quantity + 1 }
                              : item
                          )
                        );
                      } else {
                        const newItem: CartItem = {
                          id: Date.now().toString(),
                          name: selectedDoc.name,
                          price: selectedDoc.price,
                          quantity: 1,
                          area: selectedLegalArea,
                          country: selectedCountry,
                        };
                        setCart([...cart, newItem]);
                      }
                      // Reset selections
                      setSelectedLegalArea('');
                      setSelectedDocumentType('');
                    }
                  }}
                  className="w-full btn-primary"
                >
                  🛒 Agregar al Carrito
                </button>
                <p className="text-xs text-gray-500">
                  Los materiales se generarán automáticamente y se añadirán a tu biblioteca una vez completado el pago.
                </p>
              </div>
              )}

              {/* Shopping Cart */}
              {cart.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    🛒 Carrito de Compras
                    <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {cart.reduce((total, item) => total + item.quantity, 0)} items
                    </span>
                  </h4>
                  
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                          <p className="text-xs text-gray-500">{item.area}</p>
                          <p className="text-sm text-green-600 font-medium">€{item.price.toFixed(2)}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                setCart(cart.map(cartItem => 
                                  cartItem.id === item.id 
                                    ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                    : cartItem
                                ));
                              }
                            }}
                            className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          
                          <span className="w-12 text-center text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => {
                              setCart(cart.map(cartItem => 
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                  : cartItem
                              ));
                            }}
                            className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                          >
                            +
                          </button>
                          
                          <button
                            onClick={() => {
                              setCart(cart.filter(cartItem => cartItem.id !== item.id));
                            }}
                            className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Summary */}
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="text-sm text-gray-900">
                        €{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-700">Total:</span>
                      <span className="text-lg font-bold text-green-600">
                        €{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setCart([])}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        🗑️ Vaciar Carrito
                      </button>
                      <button 
                        onClick={handleProceedToPayment}
                        className="flex-1 btn-primary"
                      >
                        💳 Proceder al Pago
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase History Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                <span>📋 Historial de Compras</span>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full self-start sm:ml-2">
                  {purchaseHistory.length} compras
                </span>
              </h3>
              
              {purchaseLoading ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-gray-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                  <p>Cargando historial de compras...</p>
                </div>
              ) : purchaseError ? (
                <div className="py-8 px-4 bg-red-50 border border-red-200 rounded-md text-center">
                  <h4 className="text-lg font-medium text-red-700 mb-2">No pudimos cargar tus compras</h4>
                  <p className="text-sm text-red-600 mb-4">{purchaseError}</p>
                  <button
                    onClick={() => setPurchaseReloadToken((value) => value + 1)}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No hay compras anteriores</h4>
                  <p className="text-gray-500">Tus compras de documentos legales aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {purchaseHistory.map((purchase) => (
                    <div key={purchase.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      {/* Purchase Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              Compra #{purchase.id}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {toDate(purchase.createdAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${
                              purchase.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : purchase.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className="hidden sm:inline">
                                {purchase.status === 'completed' ? '✅ Completada' : 
                                 purchase.status === 'pending' ? '⏳ Pendiente' : '❌ Cancelada'}
                              </span>
                              <span className="sm:hidden">
                                {purchase.status === 'completed' ? '✅' : 
                                 purchase.status === 'pending' ? '⏳' : '❌'}
                              </span>
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-green-600">
                            {formatCurrency(purchase.total, purchase.currency)}
                          </p>
                        </div>
                      </div>

                      {/* Purchase Items */}
                      <div className="border-t border-gray-100 pt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Documentos adquiridos:</h5>
                        {purchase.items.length === 0 ? (
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
                            Esta compra no tiene documentos asociados todavía.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {purchase.items.map((item) => (
                            <details key={item.id} className="bg-gray-50 rounded-md group">
                              <summary className="list-none p-3 cursor-pointer">
                                <div className="flex items-center">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {(item.area || 'Área no especificada')} — {item.name}
                                    </p>
                                  </div>
                                  <div className="ml-4 flex items-center space-x-4 text-xs sm:text-sm">
                                    <span className="text-gray-500">
                                      <span className="hidden sm:inline">Cantidad: </span>
                                      <span className="sm:hidden">Qty: </span>
                                      <span className="font-medium">{item.quantity}</span>
                                    </span>
                                    <span className="text-gray-500">
                                      <span className="hidden sm:inline">Precio: </span>
                                      {formatCurrency(item.price, purchase.currency)}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {formatCurrency(item.price * item.quantity, purchase.currency)}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                              </summary>
                              <div className="px-3 pb-3">
                                <div className="border-t border-gray-100 pt-3">
                                  <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
                                    <button
                                      onClick={() => handleViewDocument(item as any)}
                                      disabled={
                                        documentActionLoadingId === item.id ||
                                        (!(item as any).packageFiles?.studyMaterialPdf?.downloadUrl &&
                                          !(item as any).downloadUrl &&
                                          !(item as any).previewUrl &&
                                          !(item as any).storagePath &&
                                          !(item as any).documentId)
                                      }
                                      className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                                        documentActionLoadingId === item.id
                                          ? 'bg-blue-100 text-blue-500 cursor-not-allowed'
                                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                      }`}
                                    >
                                      {documentActionLoadingId === item.id ? 'Abriendo...' : 'Ver documento'}
                                    </button>
                                    <button
                                      onClick={() => handleDownloadDocument(item as any)}
                                      disabled={
                                        documentActionLoadingId === item.id ||
                                        (!(item as any).packageFiles?.studyMaterialPdf?.downloadUrl &&
                                          !(item as any).downloadUrl &&
                                          !(item as any).previewUrl &&
                                          !(item as any).storagePath &&
                                          !(item as any).documentId)
                                      }
                                      className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                                        documentActionLoadingId === item.id
                                          ? 'bg-green-100 text-green-500 cursor-not-allowed'
                                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                                      }`}
                                    >
                                      {documentActionLoadingId === item.id ? 'Descargando...' : 'Descargar'}
                                    </button>
                                  </div>

                                  {item.packageFiles && (
                                    <div className="mt-3 border border-green-100 bg-green-50 rounded-md p-3">
                                      <p className="text-xs font-medium text-green-700 mb-2">
                                        Materiales descargables
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {item.packageFiles.templateDocx?.downloadUrl && (
                                          <a
                                            href={item.packageFiles.templateDocx.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors"
                                          >
                                            Plantilla (Word)
                                            <span className="text-[10px] text-green-500 ml-2">.docx</span>
                                          </a>
                                        )}
                                        {item.packageFiles.templatePdf?.downloadUrl && (
                                          <a
                                            href={item.packageFiles.templatePdf.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors"
                                          >
                                            Plantilla (PDF)
                                            <span className="text-[10px] text-green-500 ml-2">.pdf</span>
                                          </a>
                                        )}
                                        {item.packageFiles.sampleDocx?.downloadUrl && (
                                          <a
                                            href={item.packageFiles.sampleDocx.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors"
                                          >
                                            Ejemplo (Word)
                                            <span className="text-[10px] text-green-500 ml-2">.docx</span>
                                          </a>
                                        )}
                                        {item.packageFiles.samplePdf?.downloadUrl && (
                                          <a
                                            href={item.packageFiles.samplePdf.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors"
                                          >
                                            Ejemplo (PDF)
                                            <span className="text-[10px] text-green-500 ml-2">.pdf</span>
                                          </a>
                                        )}
                                        {item.packageFiles.studyMaterialPdf?.downloadUrl && (
                                          <a
                                            href={item.packageFiles.studyMaterialPdf.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors sm:col-span-2"
                                          >
                                            Dossier académico (PDF)
                                            <span className="text-[10px] text-green-500 ml-2">≥ 3 páginas</span>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </details>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Purchase Actions */}
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 space-y-1 sm:space-y-0">
                            <span>Total: <span className="font-medium text-gray-900">{formatCurrency(purchase.total, purchase.currency)}</span></span>
                            <span className="hidden sm:inline">•</span>
                            <span>{purchase.items.length} documento{purchase.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <button 
                              onClick={() => downloadInvoice(purchase)}
                              className="w-full sm:w-auto text-sm text-green-600 hover:text-green-800 font-medium bg-green-50 hover:bg-green-100 px-3 py-2 rounded-md transition-colors text-center"
                            >
                              📄 Descargar Factura
                            </button>
                            <div className="flex space-x-2">
                              <button className="flex-1 sm:flex-none text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-center">
                                📄 Ver Docs
                              </button>
                              <button className="flex-1 sm:flex-none text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-center">
                                📧 Email
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Purchase Summary */}
              {purchaseHistory.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Resumen de Compras</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div className="flex justify-between sm:block">
                      <span className="text-blue-700">Total de compras:</span>
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">{purchaseSummary.count}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-blue-700">Total gastado:</span>
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">
                        {formatCurrency(purchaseSummary.totalSpent, purchaseSummary.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between sm:block sm:col-span-2 lg:col-span-1">
                      <span className="text-blue-700">Documentos adquiridos:</span>
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">
                        {purchaseSummary.totalDocuments}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function EstudiantesDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <EstudiantesDashboardContent />
    </Suspense>
  );
}
