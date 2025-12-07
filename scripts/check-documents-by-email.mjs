// Script ESM para verificar documentos por email
import admin from 'firebase-admin';

// Configuración de Firebase Admin
const serviceAccount = {
  projectId: "avocat-legaltech-v3",
  clientEmail: "firebase-adminsdk-fbsvc@avocat-legaltech-v3.iam.gserviceaccount.com",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 
    `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDCoHh2M0UYctDs
WxOdAtYpMuKOPZGAgQqLMil2Go+yC2mEpmtHAjgQdueoGHycfcThWtaaR2SLl5WV
x5U04qFJFPJDXxywuVHBYIAFhEDicvcVZkqoCR+4hAKqypOdccG0/JwD0/+Z6EpJ
3zUqm/DFjyO0rLrl9wgs3WZkDTTRZ+VHc8YzBD1ZPtwn7ccRubszwA81rVukX4ys
+DM7guMGCrTWeJwugjwvLAIS3S6SnEObclTHOpIQbXYubETxwih63FCpcjRvRPgH
2jtX/4Xp1nC1+zrfbcWQy/C0BZCZBU6fA7bBk3XxBqflhDLj9KdKyYsJv4Xpxewf
wP/UuSidAgMBAAECggEACIW52KUslqI6c0sWrAaqhZHQmV1pUGj2Ivu+lIkbtzZo
N7KI2opmlZP7V2FBHaIlO5/8azOKm9E2r+EWL8NnwBk+dYRF75gh1Bera3Jr2+6g
UqvQw5Rosu325u8pcRjA3HG+TC2dkOn6zMrNG3FKJQB8VgZFRdogHcTRHbr1T+EK
+rZPkNhaCPLR/D6a24pbMlhnX+M35s5ZDedoCimFvR3957+AjJM2jzeQHnapPgrQ
YYqv+nOuN69PML3IeYrEA3xoRyHdpsdPJvM2jtMxAZ/+vDqIoZsEmnLiZtWrP4+v
/zM37+L/C7KNcC40geQ0p9USt8jcKJSdtKmt5++kuQKBgQDmCDG6Jc+NTvkSsCNU
9egdfL/cChe/haO1UzuuMO7gMJCtC+8OaKwJnF5zF6SW+vWwoxNDePYO17SamZLz
KABnZHSn9jbKZKir2qnSWyn+rL9iPGtFg4LHr9/SX7j6O3fmpQbuyhunW3BsK6RJ
Ia9wC5yngXSEtZCeahATBi3QFQKBgQDYmRXSDbQsnMMsJY6I1+Qxx4ojT2R51x+W
HkL1b2uhuGWqxalaBrYBHV/IS0f2PphrYBy9qY5h9ain1lQo4VpQgkjnYulGQb5b
uEvRbC+elR1E04DC4MzBIcx8YLy2XrfAb0ZMGB+cNcU7o20tTUHYFR3O9fFm544x
yRqPwReQaQKBgQCt4E/GR0Jlq+Y1rBJo7B/x+hQEPVTKHjgqnamk97P4nn0dcMHY
gGJaOWpjUOHGhhgk1n9/JvXHLmGD4sXjKr9zZ8mOFFxCDGg6zuRC70oFCYr4tHbZ
apj2XAixOk3WSBFPtDpTUU4p6MJH4Y0jAmVcKkrVitMKZTvVopJX7vm+KQKBgQCg
WcTjuy12EaAUIMHC4UGY8MZ9mZsi8HX75u9fUFt4YFEz+h2D/o/jh2GPoNvnmzOv
2nmsl8hHEV0I1A1+Lkd0bt+WHY3ha26H7IqEwfkHCBGhEIu0ukQbfvAp7FwJD1ot
5rM+RmWwecZIfpanARkL5aYpv741lpuYk+9MGYFecQKBgQDTVxHPfRQSDScpZD23
/o/oTHN0/lo7UcIZvlNKV+qIbbOwxTOj4sU3Mq+3iV0M52r3jRcCIMzGdBgmu5cP
sdx6U0hMyuJHEy+7HYzRdduOxw7n2Xj5M2whgG6Jxm/SfrAViSPUoRS2NXHU3IJK
l+m0Jtnh77qJk1wuBFVyucbdkw==
-----END PRIVATE KEY-----`
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
    console.log(`\n🔍 Buscando documentos para: ${email}\n`);
    console.log('═'.repeat(60));

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
    console.log('─'.repeat(60));

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

    console.log('─'.repeat(60));

    // 3. Buscar documentos generados (colección global)
    console.log(`📄 Buscando documentos generados (colección global)...`);
    let documentsSnapshot;
    try {
      documentsSnapshot = await db.collection('documents')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (error) {
      // Si falla por índice, intentar sin orderBy
      documentsSnapshot = await db.collection('documents')
        .where('userId', '==', uid)
        .get();
    }

    if (documentsSnapshot.empty) {
      console.log(`   ❌ No se encontraron documentos en la colección global\n`);
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
        if (data.storage?.storagePath) {
          console.log(`      Ruta Storage: ${data.storage.storagePath}`);
        }
        if (data.metadata) {
          console.log(`      Modelo: ${data.metadata.model || 'N/A'}`);
          if (data.metadata.tokensUsed) {
            console.log(`      Tokens usados: ${data.metadata.tokensUsed}`);
          }
        }
        console.log('');
      });
    }

    // 4. Buscar en subcolección users/{uid}/documents
    console.log('─'.repeat(60));
    console.log(`📁 Buscando en subcolección users/${uid}/documents...`);
    const userDocumentsSnapshot = await db.collection('users').doc(uid)
      .collection('documents')
      .orderBy('createdAt', 'desc')
      .limit(100)
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
        if (data.areaLegal) console.log(`      Área Legal: ${data.areaLegal}`);
        if (data.tipoEscrito) console.log(`      Tipo Escrito: ${data.tipoEscrito}`);
        console.log('');
      });
    }

    // 5. Buscar reclamaciones
    console.log('─'.repeat(60));
    console.log(`📋 Buscando reclamaciones de cantidades...`);
    let reclamacionesSnapshot;
    try {
      reclamacionesSnapshot = await db.collection('reclamaciones')
        .where('userId', '==', uid)
        .orderBy('fechaISO', 'desc')
        .get();
    } catch (error) {
      reclamacionesSnapshot = await db.collection('reclamaciones')
        .where('userId', '==', uid)
        .get();
    }

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
    console.log('─'.repeat(60));
    console.log(`⚖️  Buscando acciones de tutela...`);
    let tutelasSnapshot;
    try {
      tutelasSnapshot = await db.collection('tutelas')
        .where('userId', '==', uid)
        .orderBy('fechaISO', 'desc')
        .get();
    } catch (error) {
      tutelasSnapshot = await db.collection('tutelas')
        .where('userId', '==', uid)
        .get();
    }

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

    console.log('═'.repeat(60));
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${uid}`);
    console.log(`   📄 Documentos generados: ${totalDocs}`);
    console.log(`   📋 Reclamaciones: ${totalReclamaciones}`);
    console.log(`   ⚖️  Tutelas: ${totalTutelas}`);
    console.log(`   📦 Total de registros: ${totalDocs + totalReclamaciones + totalTutelas}\n`);

    if (totalDocs + totalReclamaciones + totalTutelas === 0) {
      console.log('⚠️  NO se encontró ningún documento generado para este usuario.\n');
    } else {
      console.log('✅ Se encontraron documentos generados para este usuario.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
const email = process.argv[2] || 'sergiopenapineda@icloud.com';
checkUserDocuments(email)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });




