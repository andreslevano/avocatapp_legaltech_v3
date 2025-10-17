// Script para probar el endpoint de test
const fetch = require('node-fetch');

async function probarEndpointTest() {
  console.log('🔍 Probando endpoint de test...\n');
  
  const payload = {
    test: true,
    message: 'Test message'
  };
  
  try {
    console.log('📤 Enviando petición a /api/test-audit...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/test-audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📥 Respuesta recibida: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('📄 Contenido de la respuesta:');
    console.log(responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ Test exitoso!');
      console.log('Resultado:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ Error en el test');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error:', errorData);
      } catch (e) {
        console.log('Error (texto plano):', responseText);
      }
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  probarEndpointTest().catch(console.error);
}

module.exports = { probarEndpointTest };
