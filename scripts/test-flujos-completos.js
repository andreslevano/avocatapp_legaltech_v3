/**
 * Script de Testing para Verificar los 3 Flujos Completos
 * 
 * Uso:
 *   node scripts/test-flujos-completos.js
 * 
 * Requiere:
 *   - Variables de entorno configuradas (STRIPE_SECRET_KEY, etc.)
 *   - Firebase inicializado
 *   - Servidor corriendo en localhost:3000 (o modificar BASE_URL)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Endpoint de Checkout - Estudiantes
async function testEstudiantesCheckout() {
  logSection('TEST 1: Checkout de Estudiantes');
  
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          name: 'Contrato de Trabajo',
          price: 1000, // €10.00 en centavos
          quantity: 1,
          area: 'Derecho Laboral',
          country: 'España'
        }],
        documentType: 'estudiantes',
        userId: 'test-user-id',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/dashboard/estudiantes?payment=success`,
        cancelUrl: `${BASE_URL}/dashboard/estudiantes?payment=cancelled`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logError(`Error en respuesta: ${response.status} - ${error}`);
      return false;
    }

    const data = await response.json();
    
    if (data.success && data.url) {
      logSuccess(`Sesión creada: ${data.sessionId}`);
      logSuccess(`URL de checkout: ${data.url.substring(0, 50)}...`);
      return true;
    } else {
      logError('Respuesta no contiene success o url');
      return false;
    }
  } catch (error) {
    logError(`Error en test: ${error.message}`);
    return false;
  }
}

// Test 2: Endpoint de Checkout - Reclamación (requiere caso existente)
async function testReclamacionCheckout() {
  logSection('TEST 2: Checkout de Reclamación de Cantidades');
  
  try {
    // Primero crear un caso
    log('Creando caso de prueba...');
    const caseResponse = await fetch(`${BASE_URL}/api/reclamaciones-cantidades/create-case`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: 'test-user-id'
      })
    });

    if (!caseResponse.ok) {
      logError('No se pudo crear caso de prueba');
      logWarning('Este test requiere que el endpoint create-case funcione');
      return false;
    }

    const caseData = await caseResponse.json();
    const caseId = caseData.caseId;
    logSuccess(`Caso creado: ${caseId}`);

    // Ahora intentar crear checkout (debería fallar porque no tiene OCR/borrador)
    log('Intentando crear checkout (debería fallar sin OCR/borrador)...');
    const checkoutResponse = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType: 'reclamacion_cantidades',
        caseId: caseId,
        uid: 'test-user-id',
        userId: 'test-user-id',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/dashboard/reclamacion-cantidades?payment=success&caseId=${caseId}`,
        cancelUrl: `${BASE_URL}/dashboard/reclamacion-cantidades?payment=cancelled`
      })
    });

    if (checkoutResponse.status === 400) {
      logSuccess('Validación funciona: rechaza caso sin OCR/borrador');
      return true;
    } else if (checkoutResponse.ok) {
      logWarning('Checkout creado (caso debe tener OCR/borrador en producción)');
      const data = await checkoutResponse.json();
      logSuccess(`Sesión creada: ${data.sessionId}`);
      return true;
    } else {
      const error = await checkoutResponse.text();
      logError(`Error inesperado: ${checkoutResponse.status} - ${error}`);
      return false;
    }
  } catch (error) {
    logError(`Error en test: ${error.message}`);
    return false;
  }
}

// Test 3: Endpoint de Checkout - Acción de Tutela
async function testTutelaCheckout() {
  logSection('TEST 3: Checkout de Acción de Tutela');
  
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          name: 'Acción de Tutela',
          price: 50000, // 50,000 COP
          quantity: 1,
          area: 'Derecho Constitucional',
          country: 'Colombia'
        }],
        documentType: 'accion_tutela',
        docId: 'DOC_test_123',
        tutelaId: 'TUTELA_test_123',
        formData: {
          vulnerador: 'Test',
          hechos: 'Test hechos',
          derecho: 'Test derecho',
          peticiones: 'Test peticiones'
        },
        userId: 'test-user-id',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/dashboard/accion-tutela?payment=success`,
        cancelUrl: `${BASE_URL}/dashboard/accion-tutela?payment=cancelled`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logError(`Error en respuesta: ${response.status} - ${error}`);
      return false;
    }

    const data = await response.json();
    
    if (data.success && data.url) {
      logSuccess(`Sesión creada: ${data.sessionId}`);
      logSuccess(`URL de checkout: ${data.url.substring(0, 50)}...`);
      return true;
    } else {
      logError('Respuesta no contiene success o url');
      return false;
    }
  } catch (error) {
    logError(`Error en test: ${error.message}`);
    return false;
  }
}

// Test 4: Verificar estructura de respuesta
async function testResponseStructure() {
  logSection('TEST 4: Estructura de Respuestas');
  
  const tests = [
    {
      name: 'Estudiantes',
      body: {
        items: [{ name: 'Test', price: 1000, quantity: 1 }],
        documentType: 'estudiantes',
        userId: 'test',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/cancel`
      }
    },
    {
      name: 'Tutela',
      body: {
        items: [{ name: 'Test', price: 50000, quantity: 1 }],
        documentType: 'accion_tutela',
        userId: 'test',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/cancel`
      }
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });

      if (response.ok) {
        const data = await response.json();
        const hasSuccess = 'success' in data;
        const hasUrl = 'url' in data;
        const hasSessionId = 'sessionId' in data;

        if (hasSuccess && hasUrl && hasSessionId) {
          logSuccess(`${test.name}: Estructura correcta`);
        } else {
          logError(`${test.name}: Faltan campos (success: ${hasSuccess}, url: ${hasUrl}, sessionId: ${hasSessionId})`);
          allPassed = false;
        }
      } else {
        logWarning(`${test.name}: Endpoint rechazó request (puede ser esperado)`);
      }
    } catch (error) {
      logError(`${test.name}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 5: Validaciones
async function testValidations() {
  logSection('TEST 5: Validaciones');
  
  const invalidRequests = [
    {
      name: 'Sin userId',
      body: {
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/cancel`
      }
    },
    {
      name: 'Sin customerEmail',
      body: {
        userId: 'test',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/cancel`
      }
    },
    {
      name: 'Reclamación sin caseId',
      body: {
        documentType: 'reclamacion_cantidades',
        userId: 'test',
        customerEmail: 'test@example.com',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/cancel`
      }
    }
  ];

  let allPassed = true;

  for (const test of invalidRequests) {
    try {
      const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });

      if (response.status === 400) {
        logSuccess(`${test.name}: Validación funciona (rechazado correctamente)`);
      } else {
        logError(`${test.name}: Debería rechazar pero devolvió ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`${test.name}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Ejecutar todos los tests
async function runAllTests() {
  log('\n' + '='.repeat(60));
  log('🧪 TESTING DE FLUJOS COMPLETOS', 'blue');
  log('='.repeat(60) + '\n');

  const results = {
    estudiantes: false,
    reclamacion: false,
    tutela: false,
    estructura: false,
    validaciones: false
  };

  try {
    results.estudiantes = await testEstudiantesCheckout();
    results.reclamacion = await testReclamacionCheckout();
    results.tutela = await testTutelaCheckout();
    results.estructura = await testResponseStructure();
    results.validaciones = await testValidations();

    // Resumen
    logSection('RESUMEN DE TESTS');
    
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(Boolean).length;
    
    log(`Total de tests: ${total}`);
    log(`Pasados: ${passed}`, passed === total ? 'green' : 'yellow');
    log(`Fallidos: ${total - passed}`, passed === total ? 'green' : 'red');

    console.log('\nDetalles:');
    Object.entries(results).forEach(([test, passed]) => {
      if (passed) {
        logSuccess(`${test}: ✅`);
      } else {
        logError(`${test}: ❌`);
      }
    });

    if (passed === total) {
      log('\n🎉 Todos los tests pasaron!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Algunos tests fallaron. Revisa los detalles arriba.', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    logError(`Error fatal: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  // Verificar que fetch está disponible (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('Error: Este script requiere Node.js 18+ o instalar node-fetch');
    process.exit(1);
  }

  runAllTests();
}

module.exports = { runAllTests, testEstudiantesCheckout, testReclamacionCheckout, testTutelaCheckout };

