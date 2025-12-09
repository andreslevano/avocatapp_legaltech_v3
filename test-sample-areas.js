// Script para probar la generación de PDFs para algunas áreas legales (muestra)
const fs = require('fs');
const path = require('path');

// Áreas legales de muestra para probar
const sampleAreas = {
  'Derecho Civil y Procesal Civil': [
    'Demanda de reclamación de cantidad (juicio ordinario / juicio verbal / monitorio)',
    'Escrito de oposición a juicio monitorio'
  ],
  'Derecho Penal y Procesal Penal': [
    'Denuncia y querella criminal',
    'Escrito de defensa'
  ],
  'Derecho Laboral (Jurisdicción Social)': [
    'Demanda por despido improcedente',
    'Demanda por reclamación de salarios'
  ],
  'Derecho de Familia': [
    'Demanda de divorcio contencioso',
    'Demanda de medidas paternofiliales'
  ]
};

// Función para generar un documento
async function generateDocument(areaLegal, tipoEscrito) {
  console.log(`🔄 Generando: ${tipoEscrito}...`);
  
  const response = await fetch('http://localhost:3000/api/generate-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      areaLegal: areaLegal,
      tipoEscrito: tipoEscrito,
      hechos: `Hechos del caso para ${tipoEscrito} - ejemplo específico del área de ${areaLegal}`,
      peticiones: `Se solicita la resolución favorable del caso según los fundamentos de derecho aplicables en ${areaLegal}`,
      tono: 'formal',
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
    if (data.success && data.data.pdfBase64) {
      // Crear directorio si no existe
      const outputDir = path.join(__dirname, 'generated-documents');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Guardar PDF
      const pdfBuffer = Buffer.from(data.data.pdfBase64, 'base64');
      const filename = `${tipoEscrito.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, pdfBuffer);
      
      console.log(`✅ Generado: ${areaLegal} - ${tipoEscrito}`);
      console.log(`   📄 Guardado en: ${filepath}`);
      console.log(`   📊 Tokens: ${data.data.tokensUsed}, Modelo: ${data.data.model}, Tiempo: ${data.data.elapsedMs}ms`);
      
      return { success: true, filename, tokens: data.data.tokensUsed };
    } else {
      console.log(`❌ Error generando: ${areaLegal} - ${tipoEscrito}`);
      console.log(`   Error: ${data.error?.message || 'Error desconocido'}`);
      return { success: false, error: data.error?.message };
    }
  } else {
    const errorData = await response.json();
    console.log(`❌ Error HTTP ${response.status}: ${areaLegal} - ${tipoEscrito}`);
    console.log(`   Error: ${errorData.error?.message || 'Error del servidor'}`);
    return { success: false, error: `HTTP ${response.status}` };
  }
}

// Función principal
async function generateSampleDocuments() {
  console.log('🚀 Iniciando generación de documentos de muestra...\n');
  
  const results = {
    success: 0,
    failed: 0,
    totalTokens: 0,
    documents: []
  };

  for (const [areaLegal, tiposEscrito] of Object.entries(sampleAreas)) {
    console.log(`📚 Procesando área: ${areaLegal}`);
    console.log('='.repeat(60));
    
    for (const tipoEscrito of tiposEscrito) {
      try {
        const result = await generateDocument(areaLegal, tipoEscrito);
        
        if (result.success) {
          results.success++;
          results.totalTokens += result.tokens;
          results.documents.push({
            area: areaLegal,
            tipo: tipoEscrito,
            filename: result.filename,
            tokens: result.tokens
          });
        } else {
          results.failed++;
        }
        
        // Pausa entre documentos
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`❌ Error inesperado: ${areaLegal} - ${tipoEscrito}`);
        console.log(`   Error: ${error.message}`);
        results.failed++;
      }
    }
    
    console.log('');
  }

  // Resumen final
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Documentos generados exitosamente: ${results.success}`);
  console.log(`❌ Documentos fallidos: ${results.failed}`);
  console.log(`📄 Total de documentos: ${results.success + results.failed}`);
  console.log(`🧠 Total de tokens utilizados: ${results.totalTokens.toLocaleString()}`);
  console.log(`💰 Costo estimado (GPT-4o): $${(results.totalTokens * 0.00003).toFixed(4)}`);
  console.log('');
  console.log('📁 Los documentos se han guardado en la carpeta: generated-documents/');
  console.log('');
  
  // Listar documentos generados
  if (results.documents.length > 0) {
    console.log('📋 DOCUMENTOS GENERADOS:');
    console.log('-'.repeat(60));
    results.documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.area}`);
      console.log(`   📄 ${doc.tipo}`);
      console.log(`   💾 ${doc.filename}`);
      console.log(`   🧠 ${doc.tokens} tokens`);
      console.log('');
    });
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateSampleDocuments().catch(console.error);
}

module.exports = { generateSampleDocuments, sampleAreas };
