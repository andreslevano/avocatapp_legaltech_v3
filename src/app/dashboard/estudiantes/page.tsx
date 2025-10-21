'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
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

// Cart item interface
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  area: string;
}

// Purchase history interface
interface Purchase {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
}

export default function EstudiantesDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [selectedLegalArea, setSelectedLegalArea] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<Set<string>>(new Set());
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([
    // Sample purchase history data
    {
      id: '1',
      date: '2024-01-15',
      status: 'completed',
      total: 6.00,
      items: [
        {
          id: '1-1',
          name: 'Demanda de divorcio contencioso',
          price: 3.00,
          quantity: 1,
          area: 'Derecho de Familia'
        },
        {
          id: '1-2',
          name: 'Recurso de apelación',
          price: 3.00,
          quantity: 1,
          area: 'Recursos procesales transversales'
        }
      ]
    },
    {
      id: '2',
      date: '2024-01-10',
      status: 'completed',
      total: 9.00,
      items: [
        {
          id: '2-1',
          name: 'Demanda por despido improcedente',
          price: 3.00,
          quantity: 2,
          area: 'Derecho Laboral (Jurisdicción Social)'
        },
        {
          id: '2-2',
          name: 'Escrito de defensa',
          price: 3.00,
          quantity: 1,
          area: 'Derecho Penal y Procesal Penal'
        }
      ]
    },
    {
      id: '3',
      date: '2024-01-05',
      status: 'completed',
      total: 6.00,
      items: [
        {
          id: '3-1',
          name: 'Demanda contencioso-administrativa',
          price: 3.00,
          quantity: 1,
          area: 'Derecho Administrativo y Contencioso-Administrativo'
        },
        {
          id: '3-2',
          name: 'Recurso de queja',
          price: 3.00,
          quantity: 1,
          area: 'Recursos procesales transversales'
        }
      ]
    }
  ]);
  const router = useRouter();

  // Create a payment intent record and send user to Stripe Checkout Session
  const handleProceedToPayment = async () => {
    if (!user || cart.length === 0) return;

    try {
      const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

      console.log('Cart items for checkout:', cart);
      console.log('Item count:', itemCount);
      console.log('Total amount:', totalAmount);

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
            area: item.area
          })),
          customerEmail: user.email,
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

  // Function to generate and download invoice
  const downloadInvoice = (purchase: Purchase) => {
    const invoiceContent = generateInvoiceContent(purchase);
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `factura_${purchase.id}_${purchase.date}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Function to generate invoice HTML content
  const generateInvoiceContent = (purchase: Purchase) => {
    const currentDate = new Date().toLocaleDateString('es-ES');
    const purchaseDate = new Date(purchase.date).toLocaleDateString('es-ES');
    
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
                        <td>${item.area}</td>
                        <td>${item.quantity}</td>
                        <td>€${item.price.toFixed(2)}</td>
                        <td>€${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="total-section">
        <p><strong>Subtotal:</strong> €${purchase.total.toFixed(2)}</p>
        <p><strong>IVA (0%):</strong> €0.00</p>
        <div class="total-amount">Total: €${purchase.total.toFixed(2)}</div>
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
    // Only redirect if we've definitely checked auth and confirmed no user
    // Add a small delay to prevent race conditions on page refresh
    if (authChecked && isFirebaseReady && !user) {
      const timer = setTimeout(() => {
        // Double-check auth state before redirecting
        if (auth && typeof auth.currentUser === 'function') {
          try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              router.push('/login');
            }
          } catch (error) {
            console.error('Error checking current user:', error);
            // Don't redirect on error, let the user stay
          }
        } else {
          router.push('/login');
        }
      }, 200); // 200ms delay to allow auth state to stabilize
      
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
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
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
                          setCart(cart.map(item => 
                            item.name === selectedDoc.name 
                              ? { ...item, quantity: item.quantity + 1 }
                              : item
                          ));
                        } else {
                          const newItem: CartItem = {
                            id: Date.now().toString(),
                            name: selectedDoc.name,
                            price: selectedDoc.price,
                            quantity: 1,
                            area: selectedLegalArea
                          };
                          setCart([...cart, newItem]);
                        }
                        // Reset selections
                        setSelectedLegalArea('');
                        setSelectedDocumentType('');
                      }
                    }}
                    className="btn-primary w-full"
                  >
                    🛒 Agregar al Carrito
                  </button>
                  
                  {!generatedDocuments.has(`${selectedLegalArea}-${selectedDocumentType}`) ? (
                    <button
                      onClick={async () => {
                        setIsGenerating(true);
                        try {
                          const response = await fetch('/api/generate-document', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              areaLegal: selectedLegalArea,
                              tipoEscrito: selectedDocumentType,
                              hechos: 'Hechos del caso para estudiantes - ejemplo de reclamación de cantidad',
                              peticiones: 'Se solicita el pago de la cantidad adeudada más intereses de demora',
                              tono: 'formal',
                              userId: user.uid, // Enviar el ID del usuario autenticado
                              userEmail: user.email, // Enviar el email del usuario para envío automático
                              datosCliente: {
                                nombre: 'Estudiante Ejemplo',
                                dni: '12345678A',
                                direccion: 'Calle Ejemplo, 123',
                                telefono: '600123456',
                                email: 'estudiante@ejemplo.com'
                              }
                            }),
                          });

                          if (response.ok) {
                            const data = await response.json();
                            if (data.success) {
                              // Descargar PDF
                              if (data.data.pdfBase64) {
                                const pdfBlob = new Blob([
                                  Uint8Array.from(atob(data.data.pdfBase64), c => c.charCodeAt(0))
                                ], { type: 'application/pdf' });
                                
                                const url = window.URL.createObjectURL(pdfBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = data.data.filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              }
                              
                              // Marcar como generado
                              setGeneratedDocuments(prev => new Set(prev).add(`${selectedLegalArea}-${selectedDocumentType}`));
                              
                              // Mostrar información del documento generado
                              alert(`📄 PDF generado exitosamente!\n\nTokens usados: ${data.data.tokensUsed}\nModelo: ${data.data.model}\nTiempo: ${data.data.elapsedMs}ms\n\nEl documento se ha descargado automáticamente.`);
                            } else {
                              alert(`Error: ${data.error?.message || 'Error desconocido'}`);
                            }
                          } else {
                            const errorData = await response.json();
                            alert(`Error ${response.status}: ${errorData.error?.message || 'Error generando el documento'}`);
                          }
                        } catch (error) {
                          console.error('Error:', error);
                          alert('Error generando el documento');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating}
                      className={`w-full px-4 py-2 rounded-md transition-colors font-medium ${
                        isGenerating 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                          Generando PDF...
                        </>
                      ) : (
                        '🤖 Generar PDF con IA (Gratis)'
                      )}
                    </button>
                  ) : (
                    <div className="w-full bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-green-600">✅</span>
                        <span className="font-medium">PDF generado exitosamente</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        El documento ya ha sido descargado
                      </p>
                    </div>
                  )}
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
              
              {purchaseHistory.length === 0 ? (
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
                              {new Date(purchase.date).toLocaleDateString('es-ES', {
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
                            €{purchase.total.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Purchase Items */}
                      <div className="border-t border-gray-100 pt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Documentos adquiridos:</h5>
                        <div className="space-y-2">
                          {purchase.items.map((item) => (
                            <div key={item.id} className="bg-gray-50 rounded-md p-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                <div className="flex-1 min-w-0">
                                  <h6 className="text-sm font-medium text-gray-900 line-clamp-2 sm:line-clamp-1">{item.name}</h6>
                                  <p className="text-xs text-gray-500 mt-1">{item.area}</p>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 text-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                                    <span className="text-gray-500 text-xs sm:text-sm">
                                      <span className="sm:hidden">Qty: </span>
                                      <span className="hidden sm:inline">Cantidad: </span>
                                      <span className="font-medium">{item.quantity}</span>
                                    </span>
                                    <span className="text-gray-500 text-xs sm:text-sm">
                                      <span className="sm:hidden">€{item.price.toFixed(2)}</span>
                                      <span className="hidden sm:inline">Precio: €{item.price.toFixed(2)}</span>
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-900 text-sm sm:text-base">
                                    €{(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Purchase Actions */}
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 space-y-1 sm:space-y-0">
                            <span>Total: <span className="font-medium text-gray-900">€{purchase.total.toFixed(2)}</span></span>
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
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">{purchaseHistory.length}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-blue-700">Total gastado:</span>
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">
                        €{purchaseHistory.reduce((total, purchase) => total + purchase.total, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between sm:block sm:col-span-2 lg:col-span-1">
                      <span className="text-blue-700">Documentos adquiridos:</span>
                      <span className="ml-0 sm:ml-2 font-medium text-blue-900">
                        {purchaseHistory.reduce((total, purchase) => total + purchase.items.length, 0)}
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
