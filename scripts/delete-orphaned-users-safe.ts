/**
 * Script to safely delete orphaned users from Firestore that have no associated data
 * Only deletes users confirmed to have no purchases, documents, or storage files
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/delete-orphaned-users-safe.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

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
      storageBucket: "avocat-legaltech-v3.appspot.com"
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    initializeApp({
      projectId: "avocat-legaltech-v3",
      storageBucket: "avocat-legaltech-v3.appspot.com"
    });
    console.log('⚠️ Firebase Admin initialized with default credentials');
  }
}

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

async function verifyUserHasNoData(uid: string): Promise<{ hasData: boolean; details: string }> {
  try {
    // Check purchases
    const purchasesSnapshot = await db.collection('purchases')
      .where('userId', '==', uid)
      .limit(1)
      .get();
    
    if (!purchasesSnapshot.empty) {
      return { hasData: true, details: `Has ${purchasesSnapshot.size} purchase(s)` };
    }

    // Check documents
    try {
      const documentsSnapshot = await db.collection('documents')
        .where('userId', '==', uid)
        .limit(1)
        .get();
      
      if (!documentsSnapshot.empty) {
        return { hasData: true, details: `Has ${documentsSnapshot.size} document(s)` };
      }
    } catch (error) {
      // Collection might not exist
    }

    // Check student_document_packages
    try {
      const packagesSnapshot = await db.collection('student_document_packages')
        .where('userId', '==', uid)
        .limit(1)
        .get();
      
      if (!packagesSnapshot.empty) {
        return { hasData: true, details: `Has ${packagesSnapshot.size} document package(s)` };
      }
    } catch (error) {
      // Collection might not exist
    }

    // Check Storage files
    try {
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles({ prefix: `users/${uid}/`, maxResults: 1 });
      
      if (files.length > 0) {
        return { hasData: true, details: `Has ${files.length} storage file(s)` };
      }
    } catch (error) {
      // Storage might not be accessible
    }

    return { hasData: false, details: 'No associated data' };
  } catch (error: any) {
    return { hasData: true, details: `Error checking: ${error.message}` };
  }
}

async function deleteOrphanedUsersSafe() {
  try {
    console.log('\n🗑️  Deleting orphaned users without data...\n');
    
    // List of users confirmed to have no data (from previous check)
    const usersToDelete = [
      'admin_copy_user',
      'admin_demo_user',
      'demo_admin_user',
      'test_user_normal',
      'user_001',
      'user_002',
      'user_003',
      'user_004'
    ];
    
    console.log(`📋 Planning to delete ${usersToDelete.length} users:\n`);
    usersToDelete.forEach((uid, index) => {
      console.log(`   ${index + 1}. ${uid}`);
    });
    console.log('');
    
    // Verify each user still has no data before deletion
    console.log('🔍 Verifying users have no data before deletion...\n');
    
    const verifiedUsers: string[] = [];
    const skippedUsers: Array<{uid: string, reason: string}> = [];
    
    for (const uid of usersToDelete) {
      console.log(`   Checking: ${uid}...`);
      const verification = await verifyUserHasNoData(uid);
      
      if (verification.hasData) {
        console.log(`   ⚠️  SKIPPED: ${uid} - ${verification.details}`);
        skippedUsers.push({ uid, reason: verification.details });
      } else {
        console.log(`   ✅ Verified: ${uid} - ${verification.details}`);
        verifiedUsers.push(uid);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Users verified (safe to delete): ${verifiedUsers.length}`);
    console.log(`Users skipped (have data): ${skippedUsers.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (skippedUsers.length > 0) {
      console.log('⚠️  Skipped users (will NOT be deleted):\n');
      skippedUsers.forEach(user => {
        console.log(`   - ${user.uid}: ${user.reason}`);
      });
      console.log('');
    }
    
    if (verifiedUsers.length === 0) {
      console.log('❌ No users verified for deletion. Aborting.\n');
      return;
    }
    
    // Delete verified users
    console.log(`🗑️  Deleting ${verifiedUsers.length} user document(s)...\n`);
    
    let deletedCount = 0;
    let errorCount = 0;
    const errors: Array<{uid: string, error: string}> = [];
    
    for (const uid of verifiedUsers) {
      try {
        // Get user document to show info before deletion
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log(`   Deleting: ${uid} (${userData?.email || 'N/A'})...`);
          
          await db.collection('users').doc(uid).delete();
          console.log(`   ✅ Deleted: ${uid}`);
          deletedCount++;
        } else {
          console.log(`   ⏭️  Already deleted: ${uid}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error deleting ${uid}:`, error.message);
        errorCount++;
        errors.push({ uid, error: error.message });
      }
    }
    
    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total users processed: ${usersToDelete.length}`);
    console.log(`✅ Successfully deleted: ${deletedCount}`);
    console.log(`⏭️  Skipped (had data): ${skippedUsers.length}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:\n');
      errors.forEach(err => {
        console.log(`   - ${err.uid}: ${err.error}`);
      });
      console.log('');
    }
    
    if (deletedCount > 0) {
      console.log('✅ Deletion completed successfully!\n');
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
deleteOrphanedUsersSafe()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });


