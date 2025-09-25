// Script para poblar Firestore con datos de prueba
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase (usa las mismas credenciales del .env.local)
const firebaseConfig = {
  apiKey: "AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM",
  authDomain: "avocat-legaltech-v3.firebaseapp.com",
  projectId: "avocat-legaltech-v3",
  storageBucket: "avocat-legaltech-v3.appspot.com",
  messagingSenderId: "1023426971669",
  appId: "1:1023426971669:web:fefbb72a56f7a60d3ca61c"
};

async function populateFirestore() {
  try {
    console.log('🔥 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📝 Poblando Firestore con datos de prueba...');
    
    // 1. Usuarios de prueba
    const users = [
      {
        uid: 'test-user-1',
        email: 'estudiante@test.com',
        displayName: 'Juan Pérez',
        role: 'estudiante',
        plan: 'Estudiantes',
        createdAt: new Date().toISOString(),
        profile: {
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '+34 600 123 456',
          country: 'España',
          firm: 'Universidad Complutense'
        }
      },
      {
        uid: 'test-user-2',
        email: 'abogado@test.com',
        displayName: 'María García',
        role: 'abogado',
        plan: 'Abogados',
        createdAt: new Date().toISOString(),
        profile: {
          firstName: 'María',
          lastName: 'García',
          phone: '+34 600 789 012',
          country: 'España',
          firm: 'Bufete García & Asociados'
        }
      }
    ];
    
    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`✅ Usuario creado: ${user.email}`);
    }
    
    // 2. Casos de prueba
    const cases = [
      {
        id: 'case-1',
        title: 'Reclamación de cantidad - Factura impagada',
        description: 'Cliente no ha pagado factura de 1.575,40€',
        status: 'activo',
        priority: 'alta',
        client: {
          name: 'ACME SL',
          email: 'contacto@acme.com',
          phone: '+34 900 123 456'
        },
        amount: 1575.40,
        currency: 'EUR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user-1'
      },
      {
        id: 'case-2',
        title: 'Acción de tutela - Derecho a la educación',
        description: 'Estudiante denegado acceso a beca universitaria',
        status: 'activo',
        priority: 'media',
        client: {
          name: 'Ana López',
          email: 'ana.lopez@email.com',
          phone: '+34 600 555 666'
        },
        amount: 0,
        currency: 'EUR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user-2'
      }
    ];
    
    for (const caseData of cases) {
      await setDoc(doc(db, 'cases', caseData.id), caseData);
      console.log(`✅ Caso creado: ${caseData.title}`);
    }
    
    // 3. Documentos generados
    const documents = [
      {
        id: 'doc-1',
        title: 'Reclamación de Cantidad - ACME SL',
        type: 'reclamacion_cantidad',
        status: 'generado',
        content: 'Documento de reclamación de cantidad generado por IA',
        pdfUrl: '/generated/reclamacion-acme-sl.pdf',
        createdAt: new Date().toISOString(),
        userId: 'test-user-1',
        caseId: 'case-1'
      },
      {
        id: 'doc-2',
        title: 'Acción de Tutela - Ana López',
        type: 'accion_tutela',
        status: 'generado',
        content: 'Documento de acción de tutela generado por IA',
        pdfUrl: '/generated/accion-tutela-ana-lopez.pdf',
        createdAt: new Date().toISOString(),
        userId: 'test-user-2',
        caseId: 'case-2'
      }
    ];
    
    for (const docData of documents) {
      await setDoc(doc(db, 'documents', docData.id), docData);
      console.log(`✅ Documento creado: ${docData.title}`);
    }
    
    // 4. Historial de compras
    const purchases = [
      {
        id: 'purchase-1',
        userId: 'test-user-1',
        item: 'Reclamación de Cantidad',
        price: 10.00,
        currency: 'EUR',
        status: 'completed',
        createdAt: new Date().toISOString(),
        paymentMethod: 'stripe'
      },
      {
        id: 'purchase-2',
        userId: 'test-user-2',
        item: 'Acción de Tutela',
        price: 15.00,
        currency: 'EUR',
        status: 'completed',
        createdAt: new Date().toISOString(),
        paymentMethod: 'stripe'
      }
    ];
    
    for (const purchase of purchases) {
      await setDoc(doc(db, 'purchases', purchase.id), purchase);
      console.log(`✅ Compra registrada: ${purchase.item}`);
    }
    
    // 5. Plantillas
    const templates = [
      {
        id: 'template-1',
        name: 'Reclamación de Cantidad - Estándar',
        description: 'Plantilla básica para reclamación de cantidades',
        content: 'Contenido de la plantilla...',
        category: 'civil',
        isPublic: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 'template-2',
        name: 'Acción de Tutela - Educación',
        description: 'Plantilla para acción de tutela en materia educativa',
        content: 'Contenido de la plantilla...',
        category: 'constitucional',
        isPublic: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ];
    
    for (const template of templates) {
      await setDoc(doc(db, 'templates', template.id), template);
      console.log(`✅ Plantilla creada: ${template.name}`);
    }
    
    console.log('🎉 Firestore poblado exitosamente!');
    console.log('📊 Datos creados:');
    console.log('  - 2 usuarios');
    console.log('  - 2 casos');
    console.log('  - 2 documentos');
    console.log('  - 2 compras');
    console.log('  - 2 plantillas');
    
  } catch (error) {
    console.error('❌ Error poblando Firestore:', error);
  }
}

populateFirestore();

