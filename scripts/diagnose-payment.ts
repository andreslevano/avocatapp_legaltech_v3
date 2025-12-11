/**
 * Script para diagnosticar un pago que no generó documentos
 * 
 * Uso: npx ts-node scripts/diagnose-payment.ts <userId> <email>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

// Initialize Firebase Admin
if (getApps().length === 0) {
  try {
    // Try to use application default credentials
    initializeApp({
      projectId: 'avocat-legaltech-v3'
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.log('Asegúrate de tener las credenciales configuradas o ejecutar:');
    console.log('export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json');
    process.exit(1);
  }
}

const db = getFirestore();

async function diagnosePayment(userId: string, customerEmail: string) {
  console.log('🔍 Diagnóstico de pago');
  console.log('='.repeat(60));
  console.log(`Usuario ID: ${userId}`);
  console.log(`Email: ${customerEmail}`);
  console.log('='.repeat(60));
  console.log('');

  // 1. Verificar usuario en Firestore
  console.log('1️⃣ Verificando usuario en Firestore...');
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ Usuario encontrado en Firestore');
      console.log(`   Email en Firestore: ${userData?.email}`);
      console.log(`   Nombre: ${userData?.name || 'N/A'}`);
    } else {
      console.log('❌ Usuario NO encontrado en Firestore');
    }
  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
  }
  console.log('');

  // 2. Buscar payment_metadata pendientes
  console.log('2️⃣ Buscando payment_metadata pendientes...');
  try {
    const metadataSnapshot = await db.collection('payment_metadata')
      .where('customerEmail', '==', customerEmail)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (metadataSnapshot.empty) {
      console.log('❌ No se encontraron payment_metadata para este email');
    } else {
      console.log(`✅ Se encontraron ${metadataSnapshot.size} payment_metadata:`);
      metadataSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      Status: ${data.status}`);
        console.log(`      DocumentType: ${data.documentType || 'N/A'}`);
        console.log(`      CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
        console.log(`      Items: ${data.items?.length || 0}`);
        console.log(`      SessionId: ${data.sessionId || 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error buscando payment_metadata:', error);
    if (error instanceof Error && error.message.includes('index')) {
      console.log('⚠️  Falta índice en Firestore para payment_metadata');
      console.log('   Necesitas crear un índice compuesto:');
      console.log('   - customerEmail (ASC)');
      console.log('   - createdAt (DESC)');
    }
  }
  console.log('');

  // 3. Buscar purchases del usuario
  console.log('3️⃣ Buscando purchases del usuario...');
  try {
    const purchasesSnapshot = await db.collection('purchases')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (purchasesSnapshot.empty) {
      console.log('❌ No se encontraron purchases para este usuario');
    } else {
      console.log(`✅ Se encontraron ${purchasesSnapshot.size} purchases:`);
      purchasesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Purchase ID: ${doc.id}`);
        console.log(`      Status: ${data.status}`);
        console.log(`      DocumentType: ${data.documentType || 'N/A'}`);
        console.log(`      Total: ${data.total} ${data.currency}`);
        console.log(`      Items: ${data.items?.length || 0}`);
        console.log(`      StripeSessionId: ${data.stripeSessionId || 'N/A'}`);
        console.log(`      CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
        console.log(`      WebhookProcessedAt: ${data.webhookProcessedAt?.toDate?.() || 'N/A'}`);
        if (data.items && data.items.length > 0) {
          data.items.forEach((item: any, itemIndex: number) => {
            console.log(`         Item ${itemIndex + 1}: ${item.name} - Status: ${item.status}`);
          });
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error buscando purchases:', error);
    if (error instanceof Error && error.message.includes('index')) {
      console.log('⚠️  Falta índice en Firestore para purchases');
      console.log('   Necesitas crear un índice compuesto:');
      console.log('   - userId (ASC)');
      console.log('   - createdAt (DESC)');
    }
  }
  console.log('');

  // 4. Buscar purchases por email (por si el userId no coincide)
  console.log('4️⃣ Buscando purchases por email...');
  try {
    const purchasesByEmailSnapshot = await db.collection('purchases')
      .where('customerEmail', '==', customerEmail)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (purchasesByEmailSnapshot.empty) {
      console.log('❌ No se encontraron purchases para este email');
    } else {
      console.log(`✅ Se encontraron ${purchasesByEmailSnapshot.size} purchases por email:`);
      purchasesByEmailSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Purchase ID: ${doc.id}`);
        console.log(`      UserId: ${data.userId}`);
        console.log(`      Status: ${data.status}`);
        console.log(`      DocumentType: ${data.documentType || 'N/A'}`);
        console.log(`      StripeSessionId: ${data.stripeSessionId || 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error buscando purchases por email:', error);
  }
  console.log('');

  // 5. Verificar Stripe (si hay STRIPE_SECRET_KEY)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (stripeSecretKey) {
    console.log('5️⃣ Verificando sesiones de Stripe recientes...');
    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
      
      // Buscar sesiones recientes (últimas 24 horas)
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
        created: {
          gte: Math.floor(Date.now() / 1000) - 86400 // Últimas 24 horas
        }
      });

      const matchingSessions = sessions.data.filter(s => 
        s.customer_email === customerEmail || 
        s.metadata?.userId === userId
      );

      if (matchingSessions.length === 0) {
        console.log('❌ No se encontraron sesiones de Stripe recientes para este email/usuario');
      } else {
        console.log(`✅ Se encontraron ${matchingSessions.length} sesiones de Stripe:`);
        for (const session of matchingSessions) {
          console.log(`   Session ID: ${session.id}`);
          console.log(`   Status: ${session.payment_status}`);
          console.log(`   Mode: ${session.mode}`);
          console.log(`   Amount: ${session.amount_total} ${session.currency}`);
          console.log(`   Customer Email: ${session.customer_email}`);
          console.log(`   Metadata:`, JSON.stringify(session.metadata, null, 2));
          console.log(`   Created: ${new Date(session.created * 1000).toISOString()}`);
          
          // Verificar si hay purchase en Firestore para esta sesión
          const purchaseForSession = await db.collection('purchases')
            .where('stripeSessionId', '==', session.id)
            .limit(1)
            .get();
          
          if (purchaseForSession.empty) {
            console.log(`   ⚠️  NO hay purchase en Firestore para esta sesión`);
          } else {
            console.log(`   ✅ Purchase encontrado: ${purchaseForSession.docs[0].id}`);
          }
          console.log('');
        }
      }
    } catch (error) {
      console.error('❌ Error verificando Stripe:', error);
    }
  } else {
    console.log('⚠️  STRIPE_SECRET_KEY no configurado, saltando verificación de Stripe');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Diagnóstico completado');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const userId = process.argv[2];
  const email = process.argv[3];

  if (!userId || !email) {
    console.error('Uso: npx ts-node scripts/diagnose-payment.ts <userId> <email>');
    process.exit(1);
  }

  diagnosePayment(userId, email)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { diagnosePayment };

