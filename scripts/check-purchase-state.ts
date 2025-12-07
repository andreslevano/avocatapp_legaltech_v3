/**
 * Script to check the current state of purchases for a user
 * This helps understand what needs to be fixed before running the fix script
 * 
 * Usage:
 *   npx ts-node scripts/check-purchase-state.ts <email>
 *   npx ts-node scripts/check-purchase-state.ts sergio.pena@madcloudconsulting.com
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || "avocat-legaltech-v3",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    initializeApp({
      projectId: "avocat-legaltech-v3",
    });
    console.log('⚠️ Firebase Admin initialized with default credentials');
  }
}

const db = getFirestore();
const auth = getAuth();

async function checkPurchaseState(email: string) {
  try {
    console.log(`\n🔍 Checking purchases for email: ${email}\n`);
    
    // Find user in Firebase Auth by email
    let authUser;
    try {
      authUser = await auth.getUserByEmail(email);
      console.log(`✅ Found user in Firebase Auth:`);
      console.log(`   UID: ${authUser.uid}`);
      console.log(`   Email: ${authUser.email}`);
      console.log(`   Display Name: ${authUser.displayName || 'N/A'}`);
      console.log(`   Created: ${authUser.metadata.creationTime}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`❌ User not found in Firebase Auth for email: ${email}`);
        return;
      }
      throw error;
    }
    
    // Check if user document exists in Firestore
    const userDoc = await db.collection('users').doc(authUser.uid).get();
    if (userDoc.exists) {
      console.log(`\n✅ User document EXISTS in Firestore`);
      console.log(`   Document ID: ${authUser.uid}`);
      const userData = userDoc.data();
      console.log(`   Display Name: ${userData?.displayName || 'N/A'}`);
      console.log(`   Is Active: ${userData?.isActive || 'N/A'}`);
    } else {
      console.log(`\n❌ User document MISSING in Firestore`);
      console.log(`   Document ID should be: ${authUser.uid}`);
    }
    
    // Find all purchases for this email
    console.log(`\n🔍 Searching for purchases with customerEmail: ${email}`);
    const purchasesByEmail = await db.collection('purchases')
      .where('customerEmail', '==', email)
      .get();
    
    console.log(`\n📦 Found ${purchasesByEmail.size} purchase(s) for this email:\n`);
    
    if (purchasesByEmail.empty) {
      console.log('   No purchases found');
      return;
    }
    
    let unknownCount = 0;
    let missingUserIdCount = 0;
    let correctUserIdCount = 0;
    let wrongUserIdCount = 0;
    
    for (const purchaseDoc of purchasesByEmail.docs) {
      const purchaseData = purchaseDoc.data();
      const purchaseId = purchaseDoc.id;
      
      console.log(`   Purchase ID: ${purchaseId}`);
      console.log(`   Created: ${purchaseData.createdAt?.toDate?.() || purchaseData.createdAt || 'N/A'}`);
      console.log(`   Customer Email: ${purchaseData.customerEmail || 'N/A'}`);
      console.log(`   UserId: ${purchaseData.userId || '(MISSING)'}`);
      console.log(`   Documents Generated: ${purchaseData.documentsGenerated || 0}`);
      console.log(`   Documents Failed: ${purchaseData.documentsFailed || 0}`);
      console.log(`   Status: ${purchaseData.status || 'N/A'}`);
      
      // Analyze userId
      if (!purchaseData.userId) {
        console.log(`   ⚠️  ISSUE: userId field is MISSING`);
        missingUserIdCount++;
      } else if (purchaseData.userId === 'unknown') {
        console.log(`   ⚠️  ISSUE: userId is 'unknown'`);
        unknownCount++;
      } else if (purchaseData.userId === authUser.uid) {
        console.log(`   ✅ CORRECT: userId matches user UID`);
        correctUserIdCount++;
      } else {
        console.log(`   ⚠️  ISSUE: userId (${purchaseData.userId}) does NOT match user UID (${authUser.uid})`);
        wrongUserIdCount++;
      }
      
      console.log('');
    }
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total purchases: ${purchasesByEmail.size}`);
    console.log(`   ✅ Correct userId: ${correctUserIdCount}`);
    console.log(`   ⚠️  Missing userId: ${missingUserIdCount}`);
    console.log(`   ⚠️  userId = 'unknown': ${unknownCount}`);
    console.log(`   ⚠️  Wrong userId: ${wrongUserIdCount}`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (!userDoc.exists) {
      console.log(`   1. Create user document in Firestore (run fix-missing-user.ts)`);
    }
    if (unknownCount > 0 || missingUserIdCount > 0 || wrongUserIdCount > 0) {
      console.log(`   2. Update purchases to use correct userId: ${authUser.uid}`);
      console.log(`      (The fix script will handle this)`);
    }
    if (correctUserIdCount === purchasesByEmail.size && userDoc.exists) {
      console.log(`   ✅ Everything looks correct! No action needed.`);
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    throw error;
  }
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npx ts-node scripts/check-purchase-state.ts <email>');
  console.error('   Example: npx ts-node scripts/check-purchase-state.ts sergio.pena@madcloudconsulting.com');
  process.exit(1);
}

checkPurchaseState(email)
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

