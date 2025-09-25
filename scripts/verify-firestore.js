// Script para verificar que los datos están en Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM",
  authDomain: "avocat-legaltech-v3.firebaseapp.com",
  projectId: "avocat-legaltech-v3",
  storageBucket: "avocat-legaltech-v3.appspot.com",
  messagingSenderId: "1023426971669",
  appId: "1:1023426971669:web:fefbb72a56f7a60d3ca61c"
};

async function verifyFirestore() {
  try {
    console.log('🔥 Conectando a Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📊 Verificando datos en Firestore...\n');
    
    // 1. Verificar usuarios
    console.log('👥 USUARIOS:');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.email} (${data.role}) - ${data.displayName}`);
    });
    console.log(`  Total: ${usersSnapshot.size} usuarios\n`);
    
    // 2. Verificar casos
    console.log('📁 CASOS:');
    const casesSnapshot = await getDocs(collection(db, 'cases'));
    casesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.title} (${data.status}) - €${data.amount}`);
    });
    console.log(`  Total: ${casesSnapshot.size} casos\n`);
    
    // 3. Verificar documentos
    console.log('📄 DOCUMENTOS:');
    const documentsSnapshot = await getDocs(collection(db, 'documents'));
    documentsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.title} (${data.type}) - ${data.status}`);
    });
    console.log(`  Total: ${documentsSnapshot.size} documentos\n`);
    
    // 4. Verificar compras
    console.log('💳 COMPRAS:');
    const purchasesSnapshot = await getDocs(collection(db, 'purchases'));
    purchasesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.item} - €${data.price} (${data.status})`);
    });
    console.log(`  Total: ${purchasesSnapshot.size} compras\n`);
    
    // 5. Verificar plantillas
    console.log('📋 PLANTILLAS:');
    const templatesSnapshot = await getDocs(collection(db, 'templates'));
    templatesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.name} (${data.category})`);
    });
    console.log(`  Total: ${templatesSnapshot.size} plantillas\n`);
    
    // Resumen total
    const totalDocs = usersSnapshot.size + casesSnapshot.size + documentsSnapshot.size + purchasesSnapshot.size + templatesSnapshot.size;
    console.log('🎯 RESUMEN:');
    console.log(`  Total de documentos en Firestore: ${totalDocs}`);
    console.log('  ✅ Firestore está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error verificando Firestore:', error);
  }
}

verifyFirestore();

