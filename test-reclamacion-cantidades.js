// Script de prueba para el endpoint de reclamación de cantidades
const fetch = require('node-fetch');

async function probarReclamacionCantidades() {
  console.log('🔍 Probando endpoint de reclamación de cantidades...\n');
  
  const payload = {
    acreedor: {
      nombre: "Juan Pérez García",
      nif: "12345678A",
      domicilio: "Calle Mayor 1, 28001 Madrid",
      email: "juan.perez@email.com",
      telefono: "600123456"
    },
    deudor: {
      nombre: "ACME SL",
      nif: "B12345678",
      domicilio: "Calle del Sol 5, 28001 Madrid"
    },
    cuantia: 1575.40,
    hechos: "Se entregó mercancía el 10/06/2025; factura 123 vencida el 10/07/2025 sin pago pese a requerimiento del 01/08/2025.",
    base_negocial: "Factura 123 y albarán 456",
    docs: [
      "DOC-1: Factura 123",
      "DOC-2: Albarán 456", 
      "DOC-3: Burofax 01/08/2025"
    ],
    intereses: {
      tipo: "legal",
      desde: "requerimiento"
    },
    viaPreferida: "auto",
    plaza: "Madrid",
    idioma: "es-ES"
  };
  
  try {
    console.log('📤 Enviando petición a /api/reclamacion-cantidades...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/reclamacion-cantidades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📥 Respuesta recibida: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      // Guardar PDF
      const fs = require('fs');
      const path = require('path');
      
      const pdfBuffer = await response.buffer();
      const outputDir = path.join(__dirname, 'generated-documents');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filename = `reclamacion-cantidad-test-${Date.now()}.pdf`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, pdfBuffer);
      
      console.log('\n✅ Reclamación generada exitosamente!');
      console.log(`📄 PDF guardado en: ${filepath}`);
      console.log(`📊 Tamaño del archivo: ${pdfBuffer.length} bytes`);
      
      // Mostrar headers de respuesta
      console.log('\n📋 Headers de respuesta:');
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Disposition: ${response.headers.get('content-disposition')}`);
      console.log(`X-Cauce-Recomendado: ${response.headers.get('x-cauce-recomendado')}`);
      console.log(`X-Jurisdiccion: ${response.headers.get('x-jurisdiccion')}`);
      
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error en la reclamación');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${errorText}`);
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  probarReclamacionCantidades().catch(console.error);
}

module.exports = { probarReclamacionCantidades };
