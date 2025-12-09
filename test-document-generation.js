const fs = require('fs');
const path = require('path');

// Configuración de pruebas
const testCases = [
  {
    name: 'Demanda_Civil_Reclamacion_Cantidad',
    areaLegal: 'Derecho Civil y Procesal Civil',
    tipoEscrito: 'Demanda de reclamación de cantidad (juicio ordinario)',
    hechos: 'El demandado, Juan Pérez García, con DNI 12345678A, debe al actor la cantidad de 5.000 euros por servicios de consultoría prestados entre enero y marzo de 2024. El demandado firmó un contrato el 15 de enero de 2024 comprometiéndose al pago en un plazo de 30 días, que venció el 14 de febrero de 2024 sin que se haya realizado el pago.',
    peticiones: 'Se solicita la condena del demandado al pago de la cantidad de 5.000 euros, más intereses de demora desde el 15 de febrero de 2024, más las costas del proceso.',
    tono: 'formal'
  },
  {
    name: 'Denuncia_Penal_Robo',
    areaLegal: 'Derecho Penal y Procesal Penal',
    tipoEscrito: 'Denuncia y querella criminal',
    hechos: 'El día 10 de marzo de 2024, aproximadamente a las 14:30 horas, el denunciado entró en el establecimiento comercial del denunciante situado en la calle Mayor, 123, y sustrajo diversos artículos por valor de 800 euros. El hecho fue presenciado por el empleado del establecimiento y quedó registrado en las cámaras de seguridad.',
    peticiones: 'Se solicita la investigación de los hechos, la identificación y detención del autor, y la restitución de los bienes sustraídos.',
    tono: 'formal'
  },
  {
    name: 'Demanda_Laboral_Despido',
    areaLegal: 'Derecho Laboral (Jurisdicción Social)',
    tipoEscrito: 'Demanda por despido improcedente',
    hechos: 'El demandante trabajó para la empresa demandada desde el 1 de enero de 2020 hasta el 15 de abril de 2024, fecha en que fue despedido mediante carta de despido por causas objetivas. El despido se fundamenta en la supuesta disminución de la actividad empresarial, sin embargo, la empresa no ha acreditado tal disminución ni ha seguido el procedimiento legal establecido.',
    peticiones: 'Se solicita la declaración de improcedencia del despido, la readmisión del trabajador o el pago de la indemnización correspondiente, más el salario de tramitación y las costas del proceso.',
    tono: 'formal'
  },
  {
    name: 'Recurso_Constitucional_Amparo',
    areaLegal: 'Derecho Constitucional',
    tipoEscrito: 'Recurso de amparo ante el Tribunal Constitucional',
    hechos: 'El recurrente fue sancionado por la Administración con una multa de 3.000 euros por una supuesta infracción administrativa. El procedimiento sancionador se inició sin notificación previa al interesado, vulnerando su derecho a la defensa y contradicción. La resolución sancionadora no fue motivada adecuadamente.',
    peticiones: 'Se solicita la declaración de nulidad del procedimiento sancionador por vulneración del derecho a la defensa y contradicción, así como la anulación de la sanción impuesta.',
    tono: 'técnico'
  },
  {
    name: 'Demanda_Familia_Divorcio',
    areaLegal: 'Derecho de Familia',
    tipoEscrito: 'Demanda de divorcio contencioso',
    hechos: 'Los cónyuges contrajeron matrimonio el 15 de junio de 2018. Desde hace más de dos años, la convivencia matrimonial se ha deteriorado de forma irreversible, existiendo una situación de incompatibilidad total entre los cónyuges. No existen hijos menores de edad. El matrimonio no tiene bienes gananciales de relevancia.',
    peticiones: 'Se solicita la declaración de divorcio, la disolución del régimen económico matrimonial y la condena en costas.',
    tono: 'formal'
  }
];

// Función para hacer la petición a la API
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
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Error en la respuesta: ${data.error?.message || 'Error desconocido'}`);
    }

    // Guardar el documento en la carpeta
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

// Función principal para ejecutar todas las pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de generación de documentos...');
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
    
    // Pausa entre generaciones para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumen de resultados
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log('========================');
  console.log(`✅ Documentos generados exitosamente: ${successCount}/${testCases.length}`);
  console.log(`❌ Documentos fallidos: ${testCases.length - successCount}`);
  console.log(`🔢 Total de tokens usados: ${totalTokens}`);
  console.log(`⏱️ Tiempo total: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
  
  // Detalles de cada prueba
  console.log('\n📋 DETALLES POR DOCUMENTO:');
  console.log('==========================');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.testCase}: ${result.tokensUsed} tokens, ${result.elapsedMs}ms`);
    } else {
      console.log(`❌ ${result.testCase}: ${result.error}`);
    }
  });
  
  console.log('\n🎉 Pruebas completadas!');
  console.log('📁 Revisa la carpeta "documentos_generados" para ver los archivos generados.');
}

// Ejecutar las pruebas
runTests().catch(console.error);
