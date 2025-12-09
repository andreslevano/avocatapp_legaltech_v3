// Script para probar la persistencia de documentos en Firebase
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM",
  authDomain: "avocat-legaltech-v3.firebaseapp.com",
  projectId: "avocat-legaltech-v3",
  storageBucket: "avocat-legaltech-v3.appspot.com",
  messagingSenderId: "1023426971669",
  appId: "1:1023426971669:web:fefbb72a56f7a60d3ca61c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testPersistence() {
  try {
    console.log('🧪 Probando sistema de persistencia...');
    
    // 1. Probar diagnóstico de OpenAI
    console.log('\n1️⃣ Probando diagnóstico de OpenAI...');
    const diagnoseResponse = await fetch('http://localhost:3000/api/dev/openai-diagnose');
    const diagnoseData = await diagnoseResponse.json();
    console.log('📊 Diagnóstico OpenAI:', diagnoseData);
    
    // 2. Probar generación de documento
    console.log('\n2️⃣ Probando generación de documento...');
    const generateResponse = await fetch('http://localhost:3000/api/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        areaLegal: 'Derecho Civil y Procesal Civil',
        tipoEscrito: 'Demanda de reclamación de cantidad (juicio ordinario / juicio verbal / monitorio)',
        tono: 'formal',
        datosCliente: {
          nombre: 'Juan Pérez',
          dni: '12345678A',
          direccion: 'Calle Mayor 1, Madrid'
        },
        descripcion: 'Reclamación de cantidad por servicios prestados'
      })
    });
    
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Documento generado:', {
        docId: generateData.data?.docId,
        filename: generateData.data?.filename,
        storagePath: generateData.data?.storagePath,
        downloadUrl: generateData.data?.downloadUrl ? 'Presente' : 'No disponible'
      });
      
      // 3. Probar descarga si hay docId
      if (generateData.data?.docId) {
        console.log('\n3️⃣ Probando descarga de documento...');
        const downloadUrl = `http://localhost:3000/api/documents/${generateData.data.docId}/download?uid=demo_user`;
        console.log('🔗 URL de descarga:', downloadUrl);
        
        try {
          const downloadResponse = await fetch(downloadUrl);
          if (downloadResponse.ok) {
            console.log('✅ Descarga exitosa - PDF disponible');
          } else {
            console.log('❌ Error en descarga:', downloadResponse.status);
          }
        } catch (downloadError) {
          console.log('❌ Error al probar descarga:', downloadError.message);
        }
      }
    } else {
      console.log('❌ Error generando documento:', generateResponse.status);
    }
    
    // 4. Probar historial
    console.log('\n4️⃣ Probando historial...');
    const historyResponse = await fetch('http://localhost:3000/api/reclamacion-cantidades/history?uid=demo_user');
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log('📋 Historial:', {
        totalItems: historyData.data?.items?.length || 0,
        source: historyData.data?.metadata?.source || 'unknown',
        resumen: historyData.data?.resumen || {}
      });
    } else {
      console.log('❌ Error obteniendo historial:', historyResponse.status);
    }
    
    console.log('\n🎉 Pruebas completadas!');
    
  } catch (error) {
    console.error('❌ Error en pruebas:', error.message);
  }
}

testPersistence();

