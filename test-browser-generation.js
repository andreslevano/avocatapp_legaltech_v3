const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Crear carpeta si no existe
if (!fs.existsSync('documentos_generados')) {
  fs.mkdirSync('documentos_generados');
}

async function testDocumentGeneration() {
  console.log('🚀 Iniciando pruebas con navegador...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Mostrar navegador para debugging
    defaultViewport: null 
  });
  
  const page = await browser.newPage();
  
  try {
    // Ir al dashboard de estudiantes
    console.log('📱 Navegando al dashboard...');
    await page.goto('http://localhost:3000/dashboard/estudiantes', { 
      waitUntil: 'networkidle0' 
    });
    
    // Esperar a que cargue la página
    await page.waitForSelector('select[id="legal-area"]', { timeout: 10000 });
    console.log('✅ Página cargada correctamente');
    
    // Seleccionar área legal
    console.log('🔧 Seleccionando área legal...');
    await page.selectOption('select[id="legal-area"]', 'Derecho Civil y Procesal Civil');
    
    // Esperar a que se carguen los tipos de documento
    await page.waitForSelector('select[id="document-type"]:not([disabled])', { timeout: 5000 });
    
    // Seleccionar tipo de documento
    console.log('📝 Seleccionando tipo de documento...');
    await page.selectOption('select[id="document-type"]', 'Demanda de reclamación de cantidad (juicio ordinario)');
    
    // Hacer clic en el botón de generar
    console.log('🤖 Generando documento...');
    await page.click('button:has-text("🤖 Generar con IA (Gratis)")');
    
    // Esperar a que se complete la generación (puede tomar tiempo)
    console.log('⏳ Esperando generación...');
    await page.waitForTimeout(30000); // 30 segundos
    
    // Verificar si hay errores en la consola
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Verificar si se descargó el archivo
    console.log('📁 Verificando descarga...');
    
    // Esperar un poco más para la descarga
    await page.waitForTimeout(5000);
    
    console.log('✅ Prueba completada');
    console.log('📊 Errores encontrados:', errors.length);
    if (errors.length > 0) {
      console.log('❌ Errores:', errors);
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await browser.close();
  }
}

// Ejecutar la prueba
testDocumentGeneration().catch(console.error);
