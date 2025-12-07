// Script para verificar documentos generados para un usuario por email
const admin = require('firebase-admin');

// Configuración de Firebase Admin
const serviceAccount = {
  projectId: "avocat-legaltech-v3",
  clientEmail: "firebase-adminsdk-fbsvc@avocat-legaltech-v3.iam.gserviceaccount.com",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDCoHh2M0UYctDs\nWxOdAtYpMuKOPZGAgQqLMil2Go+yC2mEpmtHAjgQdueoGHycfcThWtaaR2SLl5WV\nx5U04qFJFPJDXxywuVHBYIAFhEDicvcVZkqoCR+4hAKqypOdccG0/JwD0/+Z6EpJ\n3zUqm/DFjyO0rLrl9wgs3WZkDTTRZ+VHc8YzBD1ZPtwn7ccRubszwA81rVukX4ys\n+DM7guMGCrTWeJwugjwvLAIS3S6SnEObclTHOpIQbXYubETxwih63FCpcjRvRPgH\n2jtX/4Xp1nC1+zrfbcWQy/C0BZCZBU6fA7bBk3XxBqflhDLj9KdKyYsJv4Xpxewf\nwP/UuSidAgMBAAECggEACIW52KUslqI6c0sWrAaqhZHQmV1pUGj2Ivu+lIkbtzZo\nN7KI2opmlZP7V2FBHaIlO5/8azOKm9E2r+EWL8NnwBk+dYRF75gh1Bera3Jr2+6g\nUqvQw5Rosu325u8pcRjA3HG+TC2dkOn6zMrNG3FKJQB8VgZFRdogHcTRHbr1T+EK\n+rZPkNhaCPLR/D6a24pbMlhnX+M35s5ZDedoCimFvR3957+AjJM2jzeQHnapPgrQ\nYYqv+nOuN69PML3IeYrEA3xoRyHdpsdPJvM2jtMxAZ/+vDqIoZsEmnLiZtWrP4+v\n/zM37+L/C7KNcC40geQ0p9USt8jcKJSdtKmt5++kuQKBgQDmCDG6Jc+NTvkSsCNU\n9egdfL/cChe/haO1UzuuMO7gMJCtC+8OaKwJnF5zF6SW+vWwoxNDePYO17SamZLz\nKABnZHSn9jbKZKir2qnSWyn+rL9iPGtFg4LHr9/SX7j6O3fmpQbuyhunW3BsK6RJ\nIa9wC5yngXSEtZCeahATBi3QFQKBgQDYmRXSDbQsnMMsJY6I1+Qxx4ojT2R51x+W\nHkL1b2uhuGWqxalaBrYBHV/IS0f2PphrYBy9qY5h9ain1lQo4VpQgkjnYulGQb5b\nuEvRbC+elR1E04DC4MzBIcx8YLy2XrfAb0ZMGB+cNcU7o20tTUHYFR3O9fFm544x\nyRqPwReQaQKBgQCt4E/GR0Jlq+Y1rBJo7B/x+hQEPVTKHjgqnamk97P4nn0dcMHY\ngGJaOWpjUOHGhhgk1n9/JvXHLmGD4sXjKr9zZ8mOFFxCDGg6zuRC70oFCYr4tHbZ\napj2XAixOk3WSBFPtDpTUU4p6MJH4Y0jAmVcKkrVitMKZTvVopJX7vm+KQKBgQCg\nWcTjuy12EaAUIMHC4UGY8MZ9mZsi8HX75u9fUFt4YFEz+h2D/o/jh2GPoNvnmzOv\n2nmsl8hHEV0I1A1+Lkd0bt+WHY3ha26H7IqEwfkHCBGhEIu0ukQbfvAp7FwJD1ot\n5rM+RmWwecZIfpanARkL5aYpv741lpuYk+9MGYFecQKBgQDTVxHPfRQSDScpZD23\n/o/oTHN0/lo7UcIZvlNKV+qIbbOwxTOj4sU3Mq+3iV0M52r3jRcCIMzGdBgmu5cP\nsdx6U0hMyuJHEy+7HYzRdduOxw7n2Xj5M2whgG6Jxm/SfrAViSPUoRS2NXHU3IJK\nl+m0Jtnh77qJk1wuBFVyucbdkw==\n-----END PRIVATE KEY-----"
};

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "avocat-legaltech-v3",
    storageBucket: "avocat-legaltech-v3.appspot.com"
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUserDocuments(email) {
  try {
    console.log(`🔍 Buscando documentos para: ${email}\n`);

    // 1. Buscar usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado en Firebase Auth:`);
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Nombre: ${userRecord.displayName || 'No especificado'}`);
      console.log(`   Creado: ${userRecord.metadata.creationTime}`);
      console.log(`   Email verificado: ${userRecord.emailVerified ? 'Sí' : 'No'}\n`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`❌ Usuario NO encontrado en Firebase Auth con el email: ${email}\n`);
        return;
      }
      throw error;
    }

    const uid = userRecord.uid;

    // 2. Verificar documento de usuario en Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`✅ Documento de usuario encontrado en Firestore:`);
      console.log(`   Activo: ${userData.isActive !== false ? 'Sí' : 'No'}`);
      console.log(`   Creado: ${userData.createdAt || 'No especificado'}`);
      console.log(`   Último login: ${userData.lastLoginAt || 'No especificado'}`);
      if (userData.stats) {
        console.log(`   Estadísticas:`);
        console.log(`     - Documentos totales: ${userData.stats.totalDocuments || 0}`);
        console.log(`     - Generaciones totales: ${userData.stats.totalGenerations || 0}`);
        console.log(`     - Total gastado: €${userData.stats.totalSpent || 0}`);
      }
      console.log('');
    } else {
      console.log(`⚠️  No se encontró documento de usuario en Firestore para este UID\n`);
    }

    // 3. Buscar documentos generados
    console.log(`📄 Buscando documentos generados...`);
    const documentsSnapshot = await db.collection('documents')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (documentsSnapshot.empty) {
      console.log(`   ❌ No se encontraron documentos generados\n`);
    } else {
      console.log(`   ✅ Encontrados ${documentsSnapshot.size} documento(s):\n`);
      documentsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Documento ID: ${doc.id}`);
        console.log(`      Tipo: ${data.type || 'N/A'}`);
        console.log(`      Área Legal: ${data.areaLegal || 'N/A'}`);
        console.log(`      Tipo Escrito: ${data.tipoEscrito || 'N/A'}`);
        console.log(`      Estado: ${data.status || 'N/A'}`);
        console.log(`      Creado: ${data.createdAt || data.createdAtISO || 'N/A'}`);
        console.log(`      Nombre archivo: ${data.filename || 'N/A'}`);
        if (data.storage) {
          console.log(`      Ruta Storage: ${data.storage.storagePath || 'N/A'}`);
        }
        if (data.metadata) {
          console.log(`      Modelo: ${data.metadata.model || 'N/A'}`);
          console.log(`      Tokens usados: ${data.metadata.tokensUsed || 'N/A'}`);
        }
        console.log('');
      });
    }

    // 4. Buscar en subcolección users/{uid}/documents
    console.log(`📁 Buscando en subcolección users/${uid}/documents...`);
    const userDocumentsSnapshot = await db.collection('users').doc(uid)
      .collection('documents')
      .orderBy('createdAt', 'desc')
      .get();

    if (userDocumentsSnapshot.empty) {
      console.log(`   ❌ No se encontraron documentos en la subcolección\n`);
    } else {
      console.log(`   ✅ Encontrados ${userDocumentsSnapshot.size} documento(s) en subcolección:\n`);
      userDocumentsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Documento ID: ${doc.id}`);
        console.log(`      Nombre archivo: ${data.filename || 'N/A'}`);
        console.log(`      Creado: ${data.createdAtISO || data.createdAt || 'N/A'}`);
        console.log('');
      });
    }

    // 5. Buscar reclamaciones
    console.log(`📋 Buscando reclamaciones de cantidades...`);
    const reclamacionesSnapshot = await db.collection('reclamaciones')
      .where('userId', '==', uid)
      .orderBy('fechaISO', 'desc')
      .get();

    if (reclamacionesSnapshot.empty) {
      console.log(`   ❌ No se encontraron reclamaciones\n`);
    } else {
      console.log(`   ✅ Encontradas ${reclamacionesSnapshot.size} reclamación(es):\n`);
      reclamacionesSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Reclamación ID: ${doc.id}`);
        console.log(`      Título: ${data.titulo || 'N/A'}`);
        console.log(`      Estado: ${data.estado || 'N/A'}`);
        console.log(`      Fecha: ${data.fechaISO || 'N/A'}`);
        if (data.documentId) {
          console.log(`      Documento ID asociado: ${data.documentId}`);
        }
        console.log('');
      });
    }

    // 6. Buscar tutelas
    console.log(`⚖️  Buscando acciones de tutela...`);
    const tutelasSnapshot = await db.collection('tutelas')
      .where('userId', '==', uid)
      .orderBy('fechaISO', 'desc')
      .get();

    if (tutelasSnapshot.empty) {
      console.log(`   ❌ No se encontraron tutelas\n`);
    } else {
      console.log(`   ✅ Encontradas ${tutelasSnapshot.size} tutela(s):\n`);
      tutelasSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Tutela ID: ${doc.id}`);
        console.log(`      Título: ${data.titulo || 'N/A'}`);
        console.log(`      Estado: ${data.estado || 'N/A'}`);
        console.log(`      Fecha: ${data.fechaISO || 'N/A'}`);
        if (data.documentId) {
          console.log(`      Documento ID asociado: ${data.documentId}`);
        }
        console.log('');
      });
    }

    // 7. Resumen final
    const totalDocs = documentsSnapshot.size + userDocumentsSnapshot.size;
    const totalReclamaciones = reclamacionesSnapshot.size;
    const totalTutelas = tutelasSnapshot.size;

    console.log(`\n📊 RESUMEN:`);
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${uid}`);
    console.log(`   Documentos generados: ${totalDocs}`);
    console.log(`   Reclamaciones: ${totalReclamaciones}`);
    console.log(`   Tutelas: ${totalTutelas}`);
    console.log(`   Total registros: ${totalDocs + totalReclamaciones + totalTutelas}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
const email = process.argv[2] || 'sergiopenapineda@icloud.com';
checkUserDocuments(email)
  .then(() => {
    console.log('✅ Búsqueda completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });




