// Radiografía completa de Firestore
const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: "avocat-legaltech-v3",
  private_key_id: "b2239f1980633b5e10887c9abf243789d0099b14",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDCoHh2M0UYctDs\nWxOdAtYpMuKOPZGAgQqLMil2Go+yC2mEpmtHAjgQdueoGHycfcThWtaaR2SLl5WV\nx5U04qFJFPJDXxywuVHBYIAFhEDicvcVZkqoCR+4hAKqypOdccG0/JwD0/+Z6EpJ\n3zUqm/DFjyO0rLrl9wgs3WZkDTTRZ+VHc8YzBD1ZPtwn7ccRubszwA81rVukX4ys\n+DM7guMGCrTWeJwugjwvLAIS3S6SnEObclTHOpIQbXYubETxwih63FCpcjRvRPgH\n2jtX/4Xp1nC1+zrfbcWQy/C0BZCZBU6fA7bBk3XxBqflhDLj9KdKyYsJv4Xpxewf\nwP/UuSidAgMBAAECggEACIW52KUslqI6c0sWrAaqhZHQmV1pUGj2Ivu+lIkbtzZo\nN7KI2opmlZP7V2FBHaIlO5/8azOKm9E2r+EWL8NnwBk+dYRF75gh1Bera3Jr2+6g\nUqvQw5Rosu325u8pcRjA3HG+TC2dkOn6zMrNG3FKJQB8VgZFRdogHcTRHbr1T+EK\n+rZPkNhaCPLR/D6a24pbMlhnX+M35s5ZDedoCimFvR3957+AjJM2jzeQHnapPgrQ\nYYqv+nOuN69PML3IeYrEA3xoRyHdpsdPJvM2jtMxAZ/+vDqIoZsEmnLiZtWrP4+v\n/zM37+L/C7KNcC40geQ0p9USt8jcKJSdtKmt5++kuQKBgQDmCDG6Jc+NTvkSsCNU\n9egdfL/cChe/haO1UzuuMO7gMJCtC+8OaKwJnF5zF6SW+vWwoxNDePYO17SamZLz\nKABnZHSn9jbKZKir2qnSWyn+rL9iPGtFg4LHr9/SX7j6O3fmpQbuyhunW3BsK6RJ\nIa9wC5yngXSEtZCeahATBi3QFQKBgQDYmRXSDbQsnMMsJY6I1+Qxx4ojT2R51x+W\nHkL1b2uhuGWqxalaBrYBHV/IS0f2PphrYBy9qY5h9ain1lQo4VpQgkjnYulGQb5b\nuEvRbC+elR1E04DC4MzBIcx8YLy2XrfAb0ZMGB+cNcU7o20tTUHYFR3O9fFm544x\nyRqPwReQaQKBgQCt4E/GR0Jlq+Y1rBJo7B/x+hQEPVTKHjgqnamk97P4nn0dcMHY\ngGJaOWpjUOHGhhgk1n9/JvXHLmGD4sXjKr9zZ8mOFFxCDGg6zuRC70oFCYr4tHbZ\napj2XAixOk3WSBFPtDpTUU4p6MJH4Y0jAmVcKkrVitMKZTvVopJX7vm+KQKBgQCg\nWcTjuy12EaAUIMHC4UGY8MZ9mZsi8HX75u9fUFt4YFEz+h2D/o/jh2GPoNvnmzOv\n2nmsl8hHEV0I1A1+Lkd0bt+WHY3ha26H7IqEwfkHCBGhEIu0ukQbfvAp7FwJD1ot\n5rM+RmWwecZIfpanARkL5aYpv741lpuYk+9MGYFecQKBgQDTVxHPfRQSDScpZD23\n/o/oTHN0/lo7UcIZvlNKV+qIbbOwxTOj4sU3Mq+3iV0M52r3jRcCIMzGdBgmu5cP\nsdx6U0hMyuJHEy+7HYzRdduOxw7n2Xj5M2whgG6Jxm/SfrAViSPUoRS2NXHU3IJK\nl+m0Jtnh77qJk1wuBFVyucbdkw==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@avocat-legaltech-v3.iam.gserviceaccount.com",
  client_id: "117743969105650871323",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40avocat-legaltech-v3.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "avocat-legaltech-v3",
    storageBucket: "avocat-legaltech-v3.appspot.com"
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Función auxiliar para obtener estructura de un documento
function getDocumentStructure(data, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '...';
  
  const structure = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      structure[key] = 'null';
    } else if (Array.isArray(value)) {
      structure[key] = `Array[${value.length}]`;
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        structure[key] += ` of ${JSON.stringify(getDocumentStructure(value[0], maxDepth, currentDepth + 1))}`;
      }
    } else if (typeof value === 'object' && value !== null && !value.toDate) {
      structure[key] = getDocumentStructure(value, maxDepth, currentDepth + 1);
    } else if (value && value.toDate) {
      structure[key] = 'Timestamp';
    } else {
      structure[key] = typeof value;
    }
  }
  return structure;
}

// Función para analizar una colección
async function analyzeCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).limit(100).get();
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (documents.length === 0) {
      return {
        count: 0,
        sample: null,
        structure: null,
        fields: {}
      };
    }

    // Obtener estructura del primer documento
    const sample = documents[0];
    const structure = getDocumentStructure(sample);
    
    // Analizar campos comunes
    const fields = {};
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (key !== 'id') {
          if (!fields[key]) {
            fields[key] = {
              type: typeof doc[key],
              present: 0,
              examples: []
            };
          }
          fields[key].present++;
          if (fields[key].examples.length < 3) {
            const value = doc[key];
            if (typeof value !== 'object' || Array.isArray(value)) {
              fields[key].examples.push(value);
            } else {
              fields[key].examples.push('[Object]');
            }
          }
        }
      });
    });

    return {
      count: snapshot.size,
      sample: sample,
      structure: structure,
      fields: fields
    };
  } catch (error) {
    return {
      error: error.message,
      count: 0
    };
  }
}

// Función principal
async function generateRadiography() {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║           🔍 RADIOGRAFÍA COMPLETA DE FIRESTORE                        ║');
  console.log('║                    Avocat LegalTech v3                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // 1. INFORMACIÓN DE FIREBASE AUTH
    console.log('════════════════════════════════════════════════════════════════════════');
    console.log('1️⃣  FIREBASE AUTH - Usuarios Registrados');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    let authUsers = [];
    let nextPageToken;
    do {
      const result = await auth.listUsers(1000, nextPageToken);
      authUsers = authUsers.concat(result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    console.log(`   Total usuarios en Firebase Auth: ${authUsers.length}`);
    console.log('');
    
    // Estadísticas de usuarios
    const verified = authUsers.filter(u => u.emailVerified).length;
    const disabled = authUsers.filter(u => u.disabled).length;
    const providers = {};
    authUsers.forEach(u => {
      u.providerData.forEach(p => {
        providers[p.providerId] = (providers[p.providerId] || 0) + 1;
      });
    });

    console.log('   Estadísticas:');
    console.log(`      - Email verificado: ${verified}`);
    console.log(`      - No verificado: ${authUsers.length - verified}`);
    console.log(`      - Deshabilitados: ${disabled}`);
    console.log(`      - Activos: ${authUsers.length - disabled}`);
    console.log('   Proveedores de autenticación:');
    Object.entries(providers).forEach(([provider, count]) => {
      console.log(`      - ${provider}: ${count}`);
    });
    console.log('');
    
    // Primeros 10 usuarios
    console.log('   Primeros 10 usuarios:');
    authUsers.slice(0, 10).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email || user.uid}`);
      console.log(`      UID: ${user.uid}`);
      console.log(`      Creado: ${user.metadata.creationTime}`);
      console.log(`      Último login: ${user.metadata.lastSignInTime || 'Nunca'}`);
      console.log(`      Verificado: ${user.emailVerified ? 'Sí' : 'No'}`);
      console.log('');
    });

    // 2. COLECCIONES PRINCIPALES
    console.log('════════════════════════════════════════════════════════════════════════');
    console.log('2️⃣  COLECCIONES DE FIRESTORE');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    const collections = [
      'users',
      'documents',
      'purchases',
      'reclamaciones',
      'tutelas',
      'cases',
      'email_sends',
      'generated_emails',
      'document_analysis',
      'analytics',
      'admin',
      'templates',
      'legal_areas'
    ];

    const collectionStats = {};
    
    for (const collectionName of collections) {
      console.log(`\n   📁 Colección: ${collectionName}`);
      console.log('   ────────────────────────────────────────────────────────────────────────');
      
      const analysis = await analyzeCollection(collectionName);
      collectionStats[collectionName] = analysis;
      
      if (analysis.error) {
        console.log(`   ❌ Error: ${analysis.error}`);
        continue;
      }

      console.log(`   Total documentos: ${analysis.count}`);
      
      if (analysis.count > 0) {
        console.log('   Estructura del documento (ejemplo):');
        console.log(JSON.stringify(analysis.structure, null, 6).split('\n').map(l => '      ' + l).join('\n'));
        console.log('');
        console.log('   Campos encontrados:');
        Object.entries(analysis.fields).forEach(([field, info]) => {
          const percentage = ((info.present / analysis.count) * 100).toFixed(1);
          console.log(`      - ${field}: ${info.type} (presente en ${percentage}% de documentos)`);
          if (info.examples.length > 0 && info.type !== 'object') {
            const examples = info.examples.slice(0, 2).map(e => 
              typeof e === 'string' && e.length > 50 ? e.substring(0, 50) + '...' : e
            ).join(', ');
            console.log(`        Ejemplos: ${examples}`);
          }
        });
      } else {
        console.log('   ⚠️  Colección vacía');
      }
    }

    // 3. RELACIONES Y CONSISTENCIA
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('3️⃣  ANÁLISIS DE RELACIONES Y CONSISTENCIA');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    // Usuarios sin documentos en Firestore
    console.log('\n   Verificando usuarios sin documento en Firestore...');
    const firestoreUsers = await db.collection('users').get();
    const firestoreUserIds = new Set(firestoreUsers.docs.map(doc => doc.id));
    const authUserIds = new Set(authUsers.map(u => u.uid));
    
    const authWithoutFirestore = authUsers.filter(u => !firestoreUserIds.has(u.uid));
    const firestoreWithoutAuth = firestoreUsers.docs.filter(doc => !authUserIds.has(doc.id));
    
    console.log(`      Usuarios en Auth sin documento Firestore: ${authWithoutFirestore.length}`);
    if (authWithoutFirestore.length > 0) {
      console.log('      Primeros 5:');
      authWithoutFirestore.slice(0, 5).forEach(u => {
        console.log(`         - ${u.email || u.uid}`);
      });
    }
    
    console.log(`      Documentos Firestore sin usuario Auth: ${firestoreWithoutAuth.length}`);
    if (firestoreWithoutAuth.length > 0) {
      console.log('      Primeros 5:');
      firestoreWithoutAuth.slice(0, 5).forEach(doc => {
        console.log(`         - UID: ${doc.id}, Email: ${doc.data().email || 'N/A'}`);
      });
    }

    // Documentos huérfanos
    console.log('\n   Verificando documentos huérfanos...');
    const allDocuments = await db.collection('documents').limit(1000).get();
    const validUserIds = new Set([...authUserIds, ...firestoreUserIds]);
    const orphanDocuments = allDocuments.docs.filter(doc => {
      const userId = doc.data().userId;
      return userId && !validUserIds.has(userId);
    });
    console.log(`      Documentos con userId inválido: ${orphanDocuments.length}`);
    if (orphanDocuments.length > 0 && orphanDocuments.length <= 10) {
      orphanDocuments.forEach(doc => {
        const data = doc.data();
        console.log(`         - Doc ID: ${doc.id}, UserId: ${data.userId || 'N/A'}`);
      });
    }

    // 4. ESTADÍSTICAS GENERALES
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('4️⃣  ESTADÍSTICAS GENERALES');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    const stats = {
      authUsers: authUsers.length,
      firestoreUsers: firestoreUsers.size,
      documents: collectionStats['documents']?.count || 0,
      purchases: collectionStats['purchases']?.count || 0,
      reclamaciones: collectionStats['reclamaciones']?.count || 0,
      tutelas: collectionStats['tutelas']?.count || 0,
      cases: collectionStats['cases']?.count || 0,
      emails: (collectionStats['email_sends']?.count || 0) + (collectionStats['generated_emails']?.count || 0)
    };

    console.log('\n   Resumen:');
    console.log(`      👥 Usuarios en Auth: ${stats.authUsers}`);
    console.log(`      👥 Usuarios en Firestore: ${stats.firestoreUsers}`);
    console.log(`      📄 Documentos generados: ${stats.documents}`);
    console.log(`      💳 Compras: ${stats.purchases}`);
    console.log(`      📋 Reclamaciones: ${stats.reclamaciones}`);
    console.log(`      ⚖️  Tutelas: ${stats.tutelas}`);
    console.log(`      📁 Casos: ${stats.cases}`);
    console.log(`      📧 Emails: ${stats.emails}`);
    console.log('');

    // 5. SUBCOLECCIONES
    console.log('════════════════════════════════════════════════════════════════════════');
    console.log('5️⃣  SUBCOLECCIONES');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    // Buscar subcolecciones en usuarios
    console.log('\n   Buscando subcolecciones en usuarios...');
    const usersWithSubcollections = [];
    for (const userDoc of firestoreUsers.docs.slice(0, 10)) {
      const subcollections = await userDoc.ref.listCollections();
      if (subcollections.length > 0) {
        usersWithSubcollections.push({
          uid: userDoc.id,
          subcollections: subcollections.map(c => c.id)
        });
      }
    }

    if (usersWithSubcollections.length > 0) {
      usersWithSubcollections.forEach(user => {
        console.log(`      Usuario ${user.uid}:`);
        user.subcollections.forEach(sub => {
          console.log(`         - ${sub}`);
        });
      });
    } else {
      console.log('      No se encontraron subcolecciones en los primeros 10 usuarios');
    }

    // 6. PROBLEMAS Y RECOMENDACIONES
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('6️⃣  PROBLEMAS DETECTADOS Y RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════════════════');
    
    const issues = [];
    
    if (authWithoutFirestore.length > 0) {
      issues.push(`⚠️  ${authWithoutFirestore.length} usuarios en Auth sin documento en Firestore`);
    }
    
    if (firestoreWithoutAuth.length > 0) {
      issues.push(`⚠️  ${firestoreWithoutAuth.length} documentos Firestore sin usuario en Auth`);
    }
    
    if (orphanDocuments.length > 0) {
      issues.push(`⚠️  ${orphanDocuments.length} documentos con userId inválido`);
    }

    if (issues.length === 0) {
      console.log('\n   ✅ No se detectaron problemas críticos');
    } else {
      console.log('\n   Problemas encontrados:');
      issues.forEach(issue => console.log(`      ${issue}`));
    }

    console.log('\n   Recomendaciones:');
    console.log('      - Sincronizar usuarios entre Auth y Firestore');
    console.log('      - Revisar documentos huérfanos y vincularlos correctamente');
    console.log('      - Crear índices compuestos para consultas frecuentes');
    console.log('      - Implementar limpieza periódica de datos antiguos');

    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 RADIOGRAFÍA COMPLETADA                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ Error generando radiografía:', error);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    process.exit(1);
  }
}

generateRadiography()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });




