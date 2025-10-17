// Script simple para probar el endpoint de auditoría legal
const fetch = require('node-fetch');

async function probarEndpointSimple() {
  console.log('🔍 Probando endpoint de auditoría legal...\n');
  
  const payload = {
    perfilCliente: {
      paisISO: 'ES',
      region: 'Madrid',
      idioma: 'es-ES',
      moneda: 'EUR',
      rol: 'demandante',
      sector: 'consumo'
    },
    contextoProcesal: {
      areaLegal: 'civil',
      procedimiento: 'ordinario',
      cuantia: '1.500 EUR',
      documentos: ['Contrato de compraventa']
    },
    textoBase: 'Texto de prueba para auditoría legal.'
  };
  
  try {
    console.log('📤 Enviando petición...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/legal-audit', {
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
      console.log('\n✅ Auditoría exitosa!');
      console.log('Resultado:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ Error en la auditoría');
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
  probarEndpointSimple().catch(console.error);
}

module.exports = { probarEndpointSimple };
