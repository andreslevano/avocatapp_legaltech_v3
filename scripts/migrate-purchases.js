// Script to normalise purchases documents so the dashboard can render them
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM',
  authDomain: 'avocat-legaltech-v3.firebaseapp.com',
  projectId: 'avocat-legaltech-v3',
  storageBucket: 'avocat-legaltech-v3.appspot.com',
  messagingSenderId: '1023426971669',
  appId: '1:1023426971669:web:fefbb72a56f7a60d3ca61c',
};

async function migratePurchases() {
  console.log('🔄 Iniciando migración de purchases...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'purchases'));
  if (snapshot.empty) {
    console.log('ℹ️ No se encontraron documentos en purchases.');
    return;
  }

  const batch = writeBatch(db);
  let updated = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (Array.isArray(data.items) && data.items.length > 0) {
      return;
    }

    const itemName =
      data.item ||
      data.documentTitle ||
      data.metadata?.documentName ||
      'Documento legal';

    const itemPrice =
      typeof data.price === 'number'
        ? data.price
        : typeof data.amount === 'number'
        ? data.amount
        : 0;

    const quantity =
      typeof data.quantity === 'number' && data.quantity > 0 ? data.quantity : 1;

    const item = {
      id: data.metadata?.documentId || `${docSnap.id}-item`,
      name: itemName,
      price: itemPrice,
      quantity,
      area: data.area || data.category || data.legalArea,
      documentId: data.metadata?.documentId,
      downloadUrl:
        data.metadata?.downloadUrl || data.downloadUrl || data.pdfUrl || null,
      storagePath: data.storagePath || data.metadata?.storagePath || null,
      fileType: data.fileType || data.metadata?.fileType || 'pdf',
    };

    const total =
      typeof data.total === 'number'
        ? data.total
        : itemPrice * quantity;

    batch.update(docSnap.ref, {
      items: [item],
      total,
      currency: data.currency || 'EUR',
      status: data.status || 'completed',
    });

    updated += 1;
  });

  if (updated === 0) {
    console.log('✅ Todos los documentos ya estaban en el formato esperado.');
    return;
  }

  await batch.commit();
  console.log(`✅ Migración completada. Documentos actualizados: ${updated}`);
}

migratePurchases().catch((error) => {
  console.error('❌ Error migrando purchases:', error);
  process.exit(1);
});



