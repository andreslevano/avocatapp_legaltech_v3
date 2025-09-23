// Script para probar el endpoint de auditoría legal simple
const fetch = require('node-fetch');

async function probarAuditoriaLegalSimple() {
  console.log('🔍 Probando endpoint de auditoría legal simple...\n');
  
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
      documentos: ['Contrato de compraventa', 'Comunicación de incumplimiento']
    },
    textoBase: 'El demandante y el demandado celebraron un contrato de compraventa el día 15 de enero de 2024 por el que el demandado se comprometió a entregar un producto por un precio de 1.500 euros. El demandado incumplió su obligación de entrega, causando daños al demandante.'
  };
  
  try {
    console.log('📤 Enviando petición a /api/legal-audit-simple...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/legal-audit-simple', {
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
      console.log('\n✅ Auditoría legal simple exitosa!');
      console.log('ID:', data.data.id);
      console.log('Reporte de auditoría:');
      data.data.resultado.reporteAuditoria.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });
      console.log('\nChecklist previa:');
      data.data.resultado.checklistPrevia.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });
      console.log('\nCampos variables:');
      console.log(JSON.stringify(data.data.resultado.camposVariables, null, 2));
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
  probarAuditoriaLegalSimple().catch(console.error);
}

module.exports = { probarAuditoriaLegalSimple };
