const fs = require('fs');
const path = require('path');

// Crear carpeta si no existe
if (!fs.existsSync('documentos_generados')) {
  fs.mkdirSync('documentos_generados');
}

// Función para hacer la petición
async function generateDocument(testCase) {
  try {
    console.log(`\n🔄 Generando: ${testCase.name}`);
    
    const response = await fetch('http://localhost:3000/api/generate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areaLegal: testCase.areaLegal,
        tipoEscrito: testCase.tipoEscrito,
        hechos: testCase.hechos,
        peticiones: testCase.peticiones,
        tono: testCase.tono,
        datosCliente: {
          nombre: 'Cliente de Prueba',
          dni: '12345678A',
          direccion: 'Calle de Prueba, 123, Madrid',
          telefono: '600123456',
          email: 'cliente@prueba.com'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Error en la respuesta: ${data.error?.message || 'Error desconocido'}`);
    }

    // Guardar el documento
    const filename = `${testCase.name}_${Date.now()}.txt`;
    const filepath = path.join('documentos_generados', filename);
    
    fs.writeFileSync(filepath, data.data.content, 'utf8');
    
    console.log(`✅ Documento generado: ${filename}`);
    console.log(`📊 Tokens usados: ${data.data.tokensUsed}`);
    console.log(`🤖 Modelo: ${data.data.model}`);
    console.log(`⏱️ Tiempo: ${data.data.elapsedMs}ms`);
    console.log(`📁 Guardado en: ${filepath}`);
    
    return {
      success: true,
      filename,
      tokensUsed: data.data.tokensUsed,
      model: data.data.model,
      elapsedMs: data.data.elapsedMs
    };
    
  } catch (error) {
    console.error(`❌ Error generando ${testCase.name}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Casos de prueba
const testCases = [
  {
    name: 'Demanda_Civil_Reclamacion',
    areaLegal: 'Derecho Civil y Procesal Civil',
    tipoEscrito: 'Demanda de reclamación de cantidad (juicio ordinario)',
    hechos: 'El demandado debe al actor la cantidad de 5.000 euros por servicios prestados. El contrato se firmó el 15 de enero de 2024 con vencimiento el 14 de febrero de 2024, sin que se haya realizado el pago.',
    peticiones: 'Se solicita la condena del demandado al pago de 5.000 euros, más intereses de demora desde el 15 de febrero de 2024, más las costas del proceso.',
    tono: 'formal'
  },
  {
    name: 'Denuncia_Penal_Robo',
    areaLegal: 'Derecho Penal y Procesal Penal',
    tipoEscrito: 'Denuncia y querella criminal',
    hechos: 'El día 10 de marzo de 2024, el denunciado entró en el establecimiento del denunciante y sustrajo artículos por valor de 800 euros. El hecho fue presenciado y registrado en cámaras de seguridad.',
    peticiones: 'Se solicita la investigación de los hechos, identificación del autor y restitución de los bienes sustraídos.',
    tono: 'formal'
  }
];

// Función principal
async function runTests() {
  console.log('🚀 Iniciando pruebas de generación...');
  console.log('📁 Los documentos se guardarán en: documentos_generados/');
  
  const results = [];
  let successCount = 0;
  let totalTokens = 0;
  let totalTime = 0;
  
  for (const testCase of testCases) {
    const result = await generateDocument(testCase);
    results.push({ testCase: testCase.name, ...result });
    
    if (result.success) {
      successCount++;
      totalTokens += result.tokensUsed || 0;
      totalTime += result.elapsedMs || 0;
    }
    
    // Pausa entre generaciones
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Resumen
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log('========================');
  console.log(`✅ Documentos generados: ${successCount}/${testCases.length}`);
  console.log(`❌ Documentos fallidos: ${testCases.length - successCount}`);
  console.log(`🔢 Total tokens: ${totalTokens}`);
  console.log(`⏱️ Tiempo total: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
  
  console.log('\n📋 DETALLES:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.testCase}: ${result.tokensUsed} tokens, ${result.elapsedMs}ms`);
    } else {
      console.log(`❌ ${result.testCase}: ${result.error}`);
    }
  });
  
  console.log('\n🎉 Pruebas completadas!');
  console.log('📁 Revisa la carpeta "documentos_generados" para ver los archivos.');
}

// Ejecutar
runTests().catch(console.error);
