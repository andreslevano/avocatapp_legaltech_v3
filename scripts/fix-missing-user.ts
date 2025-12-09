/**
 * Script to create missing user document in Firestore for users that exist in Firebase Auth
 * but don't have a document in the Firestore 'users' collection.
 * 
 * Usage:
 *   npx ts-node scripts/fix-missing-user.ts <uid>
 *   npx ts-node scripts/fix-missing-user.ts jsEA1hxG6SZGuTfivccpBzGQ2uD2
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

async function createUserDocument(uid: string) {
  try {
    console.log(`\n🔍 Processing user: ${uid}`);
    
    // Check if user document already exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      console.log(`✅ User document already exists for ${uid}`);
      console.log('   Data:', userDoc.data());
      return;
    }
    
    // Get user from Firebase Auth
    const authUser = await auth.getUser(uid);
    console.log(`✅ Found user in Firebase Auth:`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Display Name: ${authUser.displayName || 'N/A'}`);
    console.log(`   Created: ${authUser.metadata.creationTime}`);
    console.log(`   Last Sign In: ${authUser.metadata.lastSignInTime || 'Never'}`);
    
    // Create user document
    const displayName = authUser.displayName || authUser.email?.split('@')[0] || 'User';
    const userData = {
      uid: uid,
      email: authUser.email || '',
      displayName: displayName,
      isAdmin: false,
      isActive: true,
      role: 'user',
      createdAt: authUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: authUser.metadata.lastSignInTime || authUser.metadata.creationTime || new Date().toISOString(),
      subscription: {
        plan: 'free',
        startDate: authUser.metadata.creationTime || new Date().toISOString(),
        isActive: true
      },
      preferences: {
        language: 'es',
        notifications: true,
        theme: 'light'
      },
      stats: {
        totalDocuments: 0,
        totalGenerations: 0,
        totalSpent: 0
      }
    };
    
    await db.collection('users').doc(uid).set(userData);
    console.log(`\n✅ User document created successfully!`);
    console.log('   Document ID:', uid);
    console.log('   Email:', userData.email);
    console.log('   Display Name:', userData.displayName);
    
    // Check for purchases that need to be linked to this user
    console.log(`\n🔍 Checking for purchases that need to be linked to this user...`);
    
    // Find all purchases for this email (regardless of userId)
    const allPurchases = await db.collection('purchases')
      .where('customerEmail', '==', authUser.email)
      .get();
    
    if (allPurchases.empty) {
      console.log(`   No purchases found for this email`);
    } else {
      console.log(`   Found ${allPurchases.size} purchase(s) for email: ${authUser.email}`);
      
      const batch = db.batch();
      let updateCount = 0;
      let correctCount = 0;
      let missingCount = 0;
      let unknownCount = 0;
      let wrongCount = 0;
      
      for (const purchaseDoc of allPurchases.docs) {
        const purchaseData = purchaseDoc.data();
        const purchaseId = purchaseDoc.id;
        const currentUserId = purchaseData.userId;
        
        // Check what needs to be fixed
        if (!currentUserId) {
          console.log(`   ⚠️  Purchase ${purchaseId}: userId is MISSING - will set to ${uid}`);
          batch.update(purchaseDoc.ref, { userId: uid });
          updateCount++;
          missingCount++;
        } else if (currentUserId === 'unknown') {
          console.log(`   ⚠️  Purchase ${purchaseId}: userId is 'unknown' - will set to ${uid}`);
          batch.update(purchaseDoc.ref, { userId: uid });
          updateCount++;
          unknownCount++;
        } else if (currentUserId !== uid) {
          console.log(`   ⚠️  Purchase ${purchaseId}: userId is '${currentUserId}' (wrong) - will set to ${uid}`);
          batch.update(purchaseDoc.ref, { userId: uid });
          updateCount++;
          wrongCount++;
        } else {
          console.log(`   ✅ Purchase ${purchaseId}: userId is already correct (${uid})`);
          correctCount++;
        }
      }
      
      if (updateCount > 0) {
        await batch.commit();
        console.log(`\n✅ Updated ${updateCount} purchase(s) to use correct userId: ${uid}`);
        if (missingCount > 0) console.log(`   - ${missingCount} with missing userId`);
        if (unknownCount > 0) console.log(`   - ${unknownCount} with userId='unknown'`);
        if (wrongCount > 0) console.log(`   - ${wrongCount} with wrong userId`);
      } else {
        console.log(`\n✅ All purchases already have correct userId`);
      }
      
      if (correctCount > 0) {
        console.log(`   - ${correctCount} already correct`);
      }
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error processing user ${uid}:`, error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('   User does not exist in Firebase Auth');
    }
    throw error;
  }
}

// Main execution
const uid = process.argv[2];

if (!uid) {
  console.error('❌ Usage: npx ts-node scripts/fix-missing-user.ts <uid>');
  console.error('   Example: npx ts-node scripts/fix-missing-user.ts jsEA1hxG6SZGuTfivccpBzGQ2uD2');
  process.exit(1);
}

createUserDocument(uid)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

