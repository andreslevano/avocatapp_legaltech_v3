// Script de prueba completo para el endpoint de reclamación de cantidades
const fetch = require('node-fetch');

async function probarReclamacionCompleta() {
  console.log('🔍 Probando endpoint completo de reclamación de cantidades...\n');
  
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
    plaza: "Madrid",
    idioma: "es-ES",
    // OCR ya aplicado
    ocr: {
      files: [
        {
          filename: "factura_123.pdf",
          docType: "factura",
          text: "Factura 123 - ACME SL - Total: 1.575,40 €",
          amounts: [
            { label: "Total", value: 1575.40, currency: "EUR", confidence: 0.95 }
          ],
          dateISO: "2025-06-10",
          confidence: 0.90
        },
        {
          filename: "albaran_456.pdf", 
          docType: "albaran",
          text: "Albarán 456 - Entrega mercancía",
          amounts: [],
          dateISO: "2025-06-10",
          confidence: 0.85
        }
      ],
      summary: {
        currency: "EUR",
        totalDetected: 1575.40,
        confidence: 0.90
      }
    },
    // Overrides de usuario
    cuantiaOverride: 1575.40,
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
    viaPreferida: "auto"
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
      
      const filename = `reclamacion-cantidad-completa-${Date.now()}.pdf`;
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

// Probar también el historial
async function probarHistorial() {
  console.log('\n🔍 Probando endpoint de historial...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/reclamacion-cantidades/history');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Historial obtenido exitosamente!');
      console.log('Items:', data.data.items.length);
      console.log('Resumen:', data.data.resumen);
      
      // Mostrar algunos items
      console.log('\n📋 Primeros items del historial:');
      data.data.items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.titulo} - ${item.fechaISO} - ${item.cuantia}€ - ${item.estado}`);
      });
      
    } else {
      console.log('❌ Error obteniendo historial');
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

// Ejecutar ambas pruebas
async function ejecutarPruebas() {
  await probarReclamacionCompleta();
  await probarHistorial();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarPruebas().catch(console.error);
}

module.exports = { probarReclamacionCompleta, probarHistorial, ejecutarPruebas };
