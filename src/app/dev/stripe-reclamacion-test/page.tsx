'use client';

import { useState, useEffect } from 'react';

export default function StripeReclamacionTestPage() {
  const [docId, setDocId] = useState('DOC_TEST_001');
  const [reclId, setReclId] = useState('RECL_TEST_001');
  const [userId, setUserId] = useState('USER_TEST_001');
  const [customerEmail, setCustomerEmail] = useState('test@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Detectar si viene de redirect de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'success') {
      setSuccess('✅ Pago completado exitosamente. Revisa Firestore para verificar que se actualizaron los datos.');
    } else if (paymentStatus === 'cancelled') {
      setError('❌ Pago cancelado por el usuario.');
    }
  }, []);

  const handleTestCheckout = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSessionId(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: 'reclamacion_cantidades',
          docId,
          reclId,
          userId,
          customerEmail,
          successUrl: `${window.location.origin}/dev/stripe-reclamacion-test?payment=success`,
          cancelUrl: `${window.location.origin}/dev/stripe-reclamacion-test?payment=cancelled`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando sesión de checkout');
      }

      if (data.success && data.url) {
        setSessionId(data.sessionId);
        setSuccess(`✅ Sesión creada: ${data.sessionId}. Redirigiendo a Stripe...`);
        
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-text-primary mb-6">
            🧪 Prueba de Stripe - Reclamación de Cantidades
          </h1>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Página de desarrollo:</strong> Esta página solo debe usarse en modo desarrollo para probar el flujo de Stripe TEST.
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              <strong>Nota:</strong> Asegúrate de tener configurado <code className="bg-yellow-100 px-1 rounded">STRIPE_SECRET_KEY</code> y <code className="bg-yellow-100 px-1 rounded">STRIPE_RECLAMACION_UNIT_AMOUNT</code> en tu <code className="bg-yellow-100 px-1 rounded">.env.local</code>
            </p>
          </div>

          {/* Formulario */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="docId" className="block text-sm font-medium text-text-secondary mb-1">
                docId
              </label>
              <input
                type="text"
                id="docId"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                placeholder="DOC_TEST_001"
              />
            </div>

            <div>
              <label htmlFor="reclId" className="block text-sm font-medium text-text-secondary mb-1">
                reclId
              </label>
              <input
                type="text"
                id="reclId"
                value={reclId}
                onChange={(e) => setReclId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                placeholder="RECL_TEST_001"
              />
            </div>

            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-text-secondary mb-1">
                userId (solo desarrollo)
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                placeholder="USER_TEST_001"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Solo se usa en desarrollo. En producción se obtiene del token de autenticación.
              </p>
            </div>

            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-text-secondary mb-1">
                customerEmail
              </label>
              <input
                type="email"
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                placeholder="test@example.com"
              />
            </div>
          </div>

          {/* Botón de prueba */}
          <button
            onClick={handleTestCheckout}
            disabled={loading}
            className={`w-full px-4 py-3 rounded-md font-medium text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando sesión...
              </span>
            ) : (
              '💳 Probar reclamación de cantidades (Stripe TEST)'
            )}
          </button>

          {/* Mensajes de estado */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
              {sessionId && (
                <p className="text-xs text-green-700 mt-2">
                  Session ID: <code className="bg-green-100 px-1 rounded">{sessionId}</code>
                </p>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-app rounded-md">
            <h2 className="text-sm font-semibold text-text-primary mb-2">📋 Instrucciones para probar:</h2>
            <ol className="text-xs text-text-secondary space-y-1 list-decimal list-inside">
              <li>Completa los campos (o usa los valores por defecto)</li>
              <li>Haz clic en el botón para crear la sesión de checkout</li>
              <li>Serás redirigido a Stripe Checkout (modo TEST)</li>
              <li>Usa una tarjeta de prueba de Stripe (ej: 4242 4242 4242 4242)</li>
              <li>Completa el pago</li>
              <li>Serás redirigido de vuelta a esta página</li>
              <li>Revisa Firestore para verificar que se actualizaron:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code>/purchases/{'{'}sessionId{'}'}</code></li>
                  <li><code>/reclamaciones/{'{'}reclId{'}'}</code></li>
                  <li><code>/documents/{'{'}docId{'}'}</code></li>
                  <li><code>/users/{'{'}userId{'}'}/stats</code></li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Tarjetas de prueba de Stripe */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💳 Tarjetas de prueba de Stripe:</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li><strong>Éxito:</strong> 4242 4242 4242 4242 (cualquier fecha futura, cualquier CVC)</li>
              <li><strong>Rechazada:</strong> 4000 0000 0000 0002</li>
              <li><strong>3D Secure:</strong> 4000 0027 6000 3184</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

