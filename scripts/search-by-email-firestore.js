// Script para buscar por email directamente en Firestore (sin Firebase Auth)
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

async function searchByEmail(email) {
  try {
    console.log('═'.repeat(70));
    console.log(`🔍 Buscando en Firestore por email: ${email}`);
    console.log('═'.repeat(70));
    console.log('');

    // 1. Buscar en colección users por email
    console.log('1️⃣ Buscando en colección "users" por email...');
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersSnapshot.empty) {
      console.log('   ❌ No se encontraron usuarios con ese email en Firestore');
      console.log('');
      
      // Buscar usuarios que contengan parte del email
      console.log('   🔍 Buscando usuarios con emails similares...');
      const allUsersSnapshot = await db.collection('users').limit(100).get();
      const matchingUsers = [];
      allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email && data.email.toLowerCase().includes('sergio') || 
            data.email && data.email.toLowerCase().includes('icloud')) {
          matchingUsers.push({ id: doc.id, ...data });
        }
      });
      
      if (matchingUsers.length > 0) {
        console.log(`   ⚠️  Encontrados ${matchingUsers.length} usuario(s) con emails similares:`);
        matchingUsers.forEach(user => {
          console.log(`      - ${user.email} (UID: ${user.id})`);
        });
        console.log('');
      }
    } else {
      console.log(`   ✅ Encontrado(s) ${usersSnapshot.size} usuario(s):`);
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`      UID: ${doc.id}`);
        console.log(`      Email: ${data.email}`);
        console.log(`      Nombre: ${data.displayName || 'N/A'}`);
        console.log(`      Activo: ${data.isActive !== false ? 'Sí' : 'No'}`);
        console.log('');
      });
    }

    // 2. Buscar en documentos que tengan el email
    console.log('─'.repeat(70));
    console.log('2️⃣ Buscando documentos con ese email...');
    
    // Buscar en emails enviados
    const emailsSnapshot = await db.collection('email_sends')
      .where('userEmail', '==', email)
      .limit(50)
      .get();

    if (emailsSnapshot.empty) {
      console.log('   ❌ No se encontraron emails enviados a ese email');
    } else {
      console.log(`   ✅ Encontrados ${emailsSnapshot.size} email(s) enviado(s):`);
      emailsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Email ID: ${doc.id}`);
        console.log(`      Asunto: ${data.subject || 'N/A'}`);
        console.log(`      Enviado: ${data.sentAt || 'N/A'}`);
        console.log(`      Estado: ${data.status || 'N/A'}`);
        if (data.userId) console.log(`      User ID: ${data.userId}`);
        console.log('');
      });
    }

    // 3. Buscar en generated_emails
    console.log('─'.repeat(70));
    console.log('3️⃣ Buscando en "generated_emails"...');
    const generatedEmailsSnapshot = await db.collection('generated_emails')
      .where('userEmail', '==', email)
      .limit(50)
      .get();

    if (generatedEmailsSnapshot.empty) {
      console.log('   ❌ No se encontraron emails generados');
    } else {
      console.log(`   ✅ Encontrados ${generatedEmailsSnapshot.size} email(s) generado(s):`);
      generatedEmailsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Email ID: ${doc.id}`);
        console.log(`      User ID: ${data.userId || 'N/A'}`);
        console.log(`      Doc ID: ${data.docId || 'N/A'}`);
        console.log(`      Enviado: ${data.sentAt || data.createdAt || 'N/A'}`);
        console.log('');
      });
    }

    console.log('═'.repeat(70));
    console.log('📊 RESUMEN:');
    console.log(`   Usuarios encontrados: ${usersSnapshot.size}`);
    console.log(`   Emails enviados: ${emailsSnapshot.size}`);
    console.log(`   Emails generados: ${generatedEmailsSnapshot.size}`);
    console.log('');
    
    if (usersSnapshot.size === 0 && emailsSnapshot.size === 0 && generatedEmailsSnapshot.size === 0) {
      console.log('⚠️  NO se encontró ninguna referencia a este email en Firestore.');
      console.log('');
      console.log('Posibles razones:');
      console.log('   - El usuario no se ha registrado aún');
      console.log('   - El email está escrito de forma diferente');
      console.log('   - Los documentos se generaron antes de que existiera el usuario');
    }
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    process.exit(1);
  }
}

const email = process.argv[2] || 'sergiopenapineda@icloud.com';
searchByEmail(email)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });




