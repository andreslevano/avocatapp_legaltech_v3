/**
 * Script to fix all users that exist in Firebase Auth but don't have documents in Firestore
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-all-missing-users.ts
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

async function createUserDocument(uid: string, authUser: any) {
  try {
    // Check if user document already exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      console.log(`   ⏭️  User document already exists for ${uid}`);
      return { created: false, updated: false };
    }
    
    // Create user document
    const displayName = authUser.displayName || authUser.email?.split('@')[0] || 'User';
    const userData = {
      uid: uid,
      email: authUser.email || '',
      displayName: displayName,
      isAdmin: false,
      isActive: !authUser.disabled,
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
    console.log(`   ✅ Created user document for ${uid} (${authUser.email})`);
    return { created: true, updated: false };
    
  } catch (error: any) {
    console.error(`   ❌ Error creating user document for ${uid}:`, error.message);
    return { created: false, updated: false, error: error.message };
  }
}

async function fixAllMissingUsers() {
  try {
    console.log('\n🔍 Finding users missing in Firestore...\n');
    
    // Get all users from Firebase Auth
    const authUsers = await auth.listUsers();
    console.log(`📋 Found ${authUsers.users.length} users in Firebase Authentication`);
    
    // Get all user documents from Firestore
    const firestoreUsersSnapshot = await db.collection('users').get();
    const firestoreUserIds = new Set(firestoreUsersSnapshot.docs.map(doc => doc.id));
    console.log(`📋 Found ${firestoreUserIds.size} user documents in Firestore\n`);
    
    // Find users that exist in Auth but not in Firestore
    const missingUsers = authUsers.users.filter(authUser => !firestoreUserIds.has(authUser.uid));
    
    if (missingUsers.length === 0) {
      console.log('✅ All users in Firebase Authentication have corresponding documents in Firestore!\n');
      return;
    }
    
    console.log(`❌ Found ${missingUsers.length} users missing in Firestore:\n`);
    
    // Display list
    missingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.uid} - ${user.email || 'N/A'}`);
    });
    
    console.log('\n🔧 Creating missing user documents...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const results: Array<{uid: string, email: string, success: boolean, error?: string}> = [];
    
    // Process each missing user
    for (const authUser of missingUsers) {
      console.log(`Processing: ${authUser.uid} (${authUser.email || 'N/A'})`);
      const result = await createUserDocument(authUser.uid, authUser);
      
      if (result.created) {
        successCount++;
        results.push({ uid: authUser.uid, email: authUser.email || '', success: true });
      } else if (result.error) {
        errorCount++;
        results.push({ uid: authUser.uid, email: authUser.email || '', success: false, error: result.error });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total users processed: ${missingUsers.length}`);
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏭️  Already existed: ${missingUsers.length - successCount - errorCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (errorCount > 0) {
      console.log('❌ Users with errors:\n');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.uid} (${result.email}): ${result.error}`);
      });
      console.log('');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  }
}

// Main execution
fixAllMissingUsers()
  .then(() => {
    console.log('✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });

