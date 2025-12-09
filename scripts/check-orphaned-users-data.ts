/**
 * Script to check what data is associated with orphaned users in Firestore
 * Verifies purchases, documents, and other related data before deletion
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/check-orphaned-users-data.ts
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

interface UserDataSummary {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  purchases: number;
  purchaseIds: string[];
  documents: number;
  documentIds: string[];
  storageFiles: number;
  storagePaths: string[];
  hasData: boolean;
}

async function checkUserData(uid: string, email: string | undefined): Promise<UserDataSummary> {
  const summary: UserDataSummary = {
    uid,
    email,
    displayName: undefined,
    purchases: 0,
    purchaseIds: [],
    documents: 0,
    documentIds: [],
    storageFiles: 0,
    storagePaths: [],
    hasData: false
  };

  try {
    // Get user document to check displayName
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      summary.displayName = userData?.displayName;
    }

    // Check purchases
    const purchasesSnapshot = await db.collection('purchases')
      .where('userId', '==', uid)
      .get();
    
    summary.purchases = purchasesSnapshot.size;
    summary.purchaseIds = purchasesSnapshot.docs.map(doc => doc.id);

    // Check documents (if there's a documents collection)
    try {
      const documentsSnapshot = await db.collection('documents')
        .where('userId', '==', uid)
        .get();
      
      summary.documents = documentsSnapshot.size;
      summary.documentIds = documentsSnapshot.docs.map(doc => doc.id);
    } catch (error) {
      // Documents collection might not exist or have different structure
    }

    // Check student_document_packages
    try {
      const packagesSnapshot = await db.collection('student_document_packages')
        .where('userId', '==', uid)
        .get();
      
      summary.documents += packagesSnapshot.size;
      summary.documentIds.push(...packagesSnapshot.docs.map(doc => doc.id));
    } catch (error) {
      // Collection might not exist
    }

    // Check Storage files
    try {
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
      summary.storageFiles = files.length;
      summary.storagePaths = files.slice(0, 10).map(file => file.name); // Limit to first 10
    } catch (error) {
      // Storage might not be accessible
    }

    // Check if user has any data
    summary.hasData = summary.purchases > 0 || summary.documents > 0 || summary.storageFiles > 0;

  } catch (error: any) {
    console.error(`   ⚠️  Error checking data for ${uid}:`, error.message);
  }

  return summary;
}

async function checkOrphanedUsersData() {
  try {
    console.log('\n🔍 Checking data associated with orphaned users...\n');
    
    // Get all users from Firebase Auth
    const authUsers = await auth.listUsers();
    const authUserIds = new Set(authUsers.users.map(user => user.uid));
    
    // Get all user documents from Firestore
    const firestoreUsersSnapshot = await db.collection('users').get();
    
    // Find orphaned users
    const orphanedUsers = firestoreUsersSnapshot.docs
      .filter(doc => !authUserIds.has(doc.id))
      .map(doc => ({
        uid: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName
      }));
    
    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found!\n');
      return;
    }
    
    console.log(`📋 Checking data for ${orphanedUsers.length} orphaned users...\n`);
    
    const results: UserDataSummary[] = [];
    
    // Check data for each orphaned user
    for (let i = 0; i < orphanedUsers.length; i++) {
      const user = orphanedUsers[i];
      console.log(`[${i + 1}/${orphanedUsers.length}] Checking: ${user.uid} (${user.email || 'N/A'})`);
      
      const summary = await checkUserData(user.uid, user.email);
      results.push(summary);
      
      if (summary.hasData) {
        console.log(`   ⚠️  Has data: ${summary.purchases} purchases, ${summary.documents} documents, ${summary.storageFiles} storage files`);
      } else {
        console.log(`   ✅ No associated data`);
      }
    }
    
    // Summary report
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 DATA ASSOCIATION REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const usersWithData = results.filter(r => r.hasData);
    const usersWithoutData = results.filter(r => !r.hasData);
    
    console.log(`Total orphaned users: ${results.length}`);
    console.log(`Users WITH associated data: ${usersWithData.length}`);
    console.log(`Users WITHOUT data (safe to delete): ${usersWithoutData.length}\n`);
    
    // Users with data - detailed
    if (usersWithData.length > 0) {
      console.log('⚠️  USERS WITH ASSOCIATED DATA (REVIEW BEFORE DELETION):\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ UID                                      │ Email                        │ Purchases │ Documents │ Storage │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
      
      usersWithData.forEach((user) => {
        const uid = user.uid.length > 40 ? user.uid.substring(0, 37) + '...' : user.uid.padEnd(40);
        const email = (user.email || 'N/A').padEnd(28);
        const purchases = user.purchases.toString().padStart(9);
        const documents = user.documents.toString().padStart(9);
        const storage = user.storageFiles.toString().padStart(7);
        console.log(`│ ${uid} │ ${email} │ ${purchases} │ ${documents} │ ${storage} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');
      
      // Detailed breakdown for users with data
      console.log('📋 DETAILED BREAKDOWN - USERS WITH DATA:\n');
      usersWithData.forEach((user, index) => {
        console.log(`${index + 1}. ${user.uid} (${user.email || 'N/A'})`);
        console.log(`   Display Name: ${user.displayName || 'N/A'}`);
        
        if (user.purchases > 0) {
          console.log(`   📦 Purchases: ${user.purchases}`);
          if (user.purchaseIds.length > 0) {
            console.log(`      IDs: ${user.purchaseIds.slice(0, 5).join(', ')}${user.purchaseIds.length > 5 ? '...' : ''}`);
          }
        }
        
        if (user.documents > 0) {
          console.log(`   📄 Documents: ${user.documents}`);
          if (user.documentIds.length > 0) {
            console.log(`      IDs: ${user.documentIds.slice(0, 5).join(', ')}${user.documentIds.length > 5 ? '...' : ''}`);
          }
        }
        
        if (user.storageFiles > 0) {
          console.log(`   💾 Storage Files: ${user.storageFiles}`);
          if (user.storagePaths.length > 0) {
            console.log(`      Sample paths: ${user.storagePaths.slice(0, 3).join(', ')}${user.storagePaths.length > 3 ? '...' : ''}`);
          }
        }
        
        console.log('');
      });
    }
    
    // Users without data
    if (usersWithoutData.length > 0) {
      console.log('✅ USERS WITHOUT DATA (SAFE TO DELETE):\n');
      usersWithoutData.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.uid} - ${user.email || 'N/A'} (${user.displayName || 'N/A'})`);
      });
      console.log('');
    }
    
    // Recommendations
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (usersWithData.length > 0) {
      console.log('⚠️  For users WITH data:');
      console.log('   1. Review the associated data (purchases, documents, files)');
      console.log('   2. Decide if data should be:');
      console.log('      - Migrated to another user');
      console.log('      - Deleted along with the user');
      console.log('      - Kept for historical records');
      console.log('   3. Consider backing up data before deletion');
      console.log('');
    }
    
    if (usersWithoutData.length > 0) {
      console.log('✅ For users WITHOUT data:');
      console.log('   - These can be safely deleted');
      console.log('   - No associated purchases, documents, or storage files');
      console.log('');
    }
    
    // Export summary
    console.log('📊 SUMMARY STATISTICS:\n');
    const totalPurchases = results.reduce((sum, r) => sum + r.purchases, 0);
    const totalDocuments = results.reduce((sum, r) => sum + r.documents, 0);
    const totalStorageFiles = results.reduce((sum, r) => sum + r.storageFiles, 0);
    
    console.log(`   Total purchases associated: ${totalPurchases}`);
    console.log(`   Total documents associated: ${totalDocuments}`);
    console.log(`   Total storage files: ${totalStorageFiles}`);
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  }
}

// Main execution
checkOrphanedUsersData()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


