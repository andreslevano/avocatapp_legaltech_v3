// Script de prueba para el sistema de auditoría legal
const fs = require('fs');
const path = require('path');

// Ejemplo de texto base para auditoría
const textoBaseEjemplo = `
AL JUZGADO DE PRIMERA INSTANCIA DE MADRID

D./Dña. [NOMBRE DEMANDANTE], mayor de edad, con DNI [DNI], domiciliado en [DOMICILIO], actuando en su propio nombre y derecho, ante este Juzgado comparezco y como mejor proceda en derecho DIGO:

Que por medio del presente escrito, interpongo DEMANDA DE RECLAMACIÓN DE CANTIDAD contra D./Dña. [NOMBRE DEMANDADO], mayor de edad, con DNI [DNI], domiciliado en [DOMICILIO].

HECHOS

PRIMERO.- El demandante y el demandado celebraron un contrato de compraventa el día [FECHA] por el que el demandado se comprometió a entregar [PRODUCTO] por un precio de [CANTIDAD] euros.

SEGUNDO.- El demandado incumplió su obligación de entrega, causando daños al demandante.

TERCERO.- El demandante ha requerido al demandado el cumplimiento de la obligación, sin resultado positivo.

FUNDAMENTOS DE DERECHO

PRIMERO.- El artículo 1101 del Código Civil establece que quedan sujetos a la indemnización de los daños y perjuicios causados los que en el cumplimiento de sus obligaciones incurran en dolo, negligencia o morosidad.

SEGUNDO.- El artículo 1108 del Código Civil establece que si la obligación no se cumple, el deudor debe indemnizar los daños y perjuicios causados.

PETICIÓN

Que se dicte sentencia estimando la demanda y condenando al demandado al pago de [CANTIDAD] euros más intereses de demora.

Madrid, [FECHA]

[FIRMA]
`;

// Función para probar auditoría legal
async function probarAuditoriaLegal() {
  console.log('🔍 Iniciando prueba del sistema de auditoría legal...\n');
  
  const casosPrueba = [
    {
      nombre: 'Caso Civil - España',
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
      textoBase: textoBaseEjemplo
    },
    {
      nombre: 'Caso Laboral - México',
      perfilCliente: {
        paisISO: 'MX',
        region: 'CDMX',
        idioma: 'es-MX',
        moneda: 'MXN',
        rol: 'demandante',
        sector: 'laboral'
      },
      contextoProcesal: {
        areaLegal: 'laboral',
        procedimiento: 'social',
        cuantia: '50.000 MXN',
        documentos: ['Contrato de trabajo', 'Recibos de nómina']
      },
      textoBase: textoBaseEjemplo.replace('DEMANDA DE RECLAMACIÓN DE CANTIDAD', 'DEMANDA LABORAL POR DESPIDO')
    },
    {
      nombre: 'Caso Mercantil - Argentina',
      perfilCliente: {
        paisISO: 'AR',
        region: 'Buenos Aires',
        idioma: 'es-AR',
        moneda: 'ARS',
        rol: 'demandante',
        sector: 'mercantil'
      },
      contextoProcesal: {
        areaLegal: 'mercantil',
        procedimiento: 'ordinario',
        cuantia: '100.000 ARS',
        documentos: ['Contrato mercantil', 'Facturas impagadas']
      },
      textoBase: textoBaseEjemplo.replace('DEMANDA DE RECLAMACIÓN DE CANTIDAD', 'DEMANDA MERCANTIL')
    }
  ];
  
  const resultados = [];
  
  for (const caso of casosPrueba) {
    console.log(`📋 Procesando: ${caso.nombre}`);
    console.log('='.repeat(60));
    
    try {
      const response = await fetch('http://localhost:3000/api/legal-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          perfilCliente: caso.perfilCliente,
          contextoProcesal: caso.contextoProcesal,
          textoBase: caso.textoBase
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Auditoría completada: ${caso.nombre}`);
          console.log(`   📊 Items de reporte: ${data.data.resultado.reporteAuditoria.length}`);
          console.log(`   ✅ Items de checklist: ${data.data.resultado.checklistPrevia.length}`);
          console.log(`   ⏱️ Tiempo: ${data.data.metadata.elapsedMs}ms`);
          
          resultados.push({
            caso: caso.nombre,
            exito: true,
            reporteItems: data.data.resultado.reporteAuditoria.length,
            checklistItems: data.data.resultado.checklistPrevia.length,
            tiempo: data.data.metadata.elapsedMs
          });
          
          // Guardar resultado detallado
          const outputDir = path.join(__dirname, 'auditoria-results');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          const filename = `${caso.nombre.replace(/\s+/g, '_')}_${Date.now()}.json`;
          const filepath = path.join(outputDir, filename);
          
          fs.writeFileSync(filepath, JSON.stringify(data.data, null, 2));
          console.log(`   💾 Resultado guardado en: ${filepath}`);
          
        } else {
          console.log(`❌ Error en auditoría: ${caso.nombre}`);
          console.log(`   Error: ${data.error?.message || 'Error desconocido'}`);
          
          resultados.push({
            caso: caso.nombre,
            exito: false,
            error: data.error?.message
          });
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ Error HTTP ${response.status}: ${caso.nombre}`);
        console.log(`   Error: ${errorData.error?.message || 'Error del servidor'}`);
        
        resultados.push({
          caso: caso.nombre,
          exito: false,
          error: `HTTP ${response.status}`
        });
      }
      
    } catch (error) {
      console.log(`❌ Error inesperado: ${caso.nombre}`);
      console.log(`   Error: ${error.message}`);
      
      resultados.push({
        caso: caso.nombre,
        exito: false,
        error: error.message
      });
    }
    
    console.log('');
    
    // Pausa entre casos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumen final
  console.log('📊 RESUMEN DE AUDITORÍAS LEGALES');
  console.log('='.repeat(60));
  
  const exitosos = resultados.filter(r => r.exito).length;
  const fallidos = resultados.filter(r => !r.exito).length;
  
  console.log(`✅ Auditorías exitosas: ${exitosos}`);
  console.log(`❌ Auditorías fallidas: ${fallidos}`);
  console.log(`📄 Total de casos: ${resultados.length}`);
  
  if (exitosos > 0) {
    const tiempoPromedio = resultados
      .filter(r => r.exito && r.tiempo)
      .reduce((sum, r) => sum + r.tiempo, 0) / exitosos;
    
    console.log(`⏱️ Tiempo promedio: ${Math.round(tiempoPromedio)}ms`);
  }
  
  console.log('');
  console.log('📋 DETALLES POR CASO:');
  console.log('-'.repeat(60));
  
  resultados.forEach((resultado, index) => {
    console.log(`${index + 1}. ${resultado.caso}`);
    if (resultado.exito) {
      console.log(`   ✅ Éxito - Reporte: ${resultado.reporteItems} items, Checklist: ${resultado.checklistItems} items, Tiempo: ${resultado.tiempo}ms`);
    } else {
      console.log(`   ❌ Fallo - Error: ${resultado.error}`);
    }
    console.log('');
  });
  
  console.log('📁 Los resultados detallados se han guardado en la carpeta: auditoria-results/');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  probarAuditoriaLegal().catch(console.error);
}

module.exports = { probarAuditoriaLegal };
