// Script para probar la generación de documentos con IA
const fetch = require('node-fetch');

async function testAIGeneration() {
  try {
    console.log('🤖 Probando generación de documentos con IA...\n');
    
    const payload = {
      areaLegal: "civil",
      tipoEscrito: "Demanda de reclamación de cantidad",
      hechos: "El demandado debe al demandante la cantidad de 1.575,40 euros por servicios prestados según factura 123 del 10/06/2025, vencida el 10/07/2025, sin que haya satisfecho el pago pese a requerimiento fehaciente del 01/08/2025.",
      peticiones: "Se solicita el pago de la cantidad adeudada más intereses de demora y costas del proceso.",
      tono: "formal",
      datosCliente: {
        nombre: "Juan Pérez García",
        dni: "12345678A",
        direccion: "Calle Mayor 1, 28001 Madrid",
        telefono: "600123456",
        email: "juan.perez@email.com"
      }
    };
    
    console.log('📤 Enviando petición a /api/generate-document...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/generate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`\n📥 Respuesta recibida: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Documento generado exitosamente!');
      console.log('📊 Datos de respuesta:');
      console.log(`  - ID: ${data.data.id}`);
      console.log(`  - Filename: ${data.data.filename}`);
      console.log(`  - Tokens usados: ${data.data.tokensUsed}`);
      console.log(`  - Modelo: ${data.data.model}`);
      console.log(`  - Tiempo: ${data.data.elapsedMs}ms`);
      console.log(`  - PDF generado: ${data.data.pdfBase64 ? 'Sí' : 'No'}`);
      
      if (data.data.pdfBase64) {
        console.log('📄 PDF base64 generado correctamente');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Error en la generación:');
      console.log(`  - Código: ${errorData.error?.code}`);
      console.log(`  - Mensaje: ${errorData.error?.message}`);
      console.log(`  - Hint: ${errorData.error?.hint}`);
    }
    
  } catch (error) {
    console.error('❌ Error al conectar con el servidor:', error.message);
  }
}

testAIGeneration();
