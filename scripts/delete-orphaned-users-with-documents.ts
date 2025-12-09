/**
 * Script to delete orphaned users and their associated documents from Firestore
 * Deletes documents from all collections before deleting the user document
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/delete-orphaned-users-with-documents.ts
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

interface DeletionSummary {
  uid: string;
  email: string | undefined;
  documentsDeleted: number;
  emailsDeleted: number;
  packagesDeleted: number;
  storageFilesDeleted: number;
  userDeleted: boolean;
  errors: string[];
}

async function deleteUserAndData(uid: string): Promise<DeletionSummary> {
  const summary: DeletionSummary = {
    uid,
    email: undefined,
    documentsDeleted: 0,
    emailsDeleted: 0,
    packagesDeleted: 0,
    storageFilesDeleted: 0,
    userDeleted: false,
    errors: []
  };

  try {
    // Get user email before deletion
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      summary.email = userDoc.data()?.email;
    }

    // Delete documents from 'documents' collection
    try {
      const documentsSnapshot = await db.collection('documents')
        .where('userId', '==', uid)
        .get();
      
      const batch = db.batch();
      documentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (documentsSnapshot.docs.length > 0) {
        await batch.commit();
        summary.documentsDeleted = documentsSnapshot.docs.length;
      }
    } catch (error: any) {
      summary.errors.push(`Documents: ${error.message}`);
    }

    // Delete documents from 'student_document_packages' collection
    try {
      const packagesSnapshot = await db.collection('student_document_packages')
        .where('userId', '==', uid)
        .get();
      
      const batch = db.batch();
      packagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (packagesSnapshot.docs.length > 0) {
        await batch.commit();
        summary.packagesDeleted = packagesSnapshot.docs.length;
      }
    } catch (error: any) {
      summary.errors.push(`Packages: ${error.message}`);
    }

    // Delete emails from 'generated_emails' collection
    try {
      const emailsSnapshot = await db.collection('generated_emails')
        .where('userId', '==', uid)
        .get();
      
      const batch = db.batch();
      emailsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (emailsSnapshot.docs.length > 0) {
        await batch.commit();
        summary.emailsDeleted = emailsSnapshot.docs.length;
      }
    } catch (error: any) {
      summary.errors.push(`Emails: ${error.message}`);
    }

    // Delete Storage files
    try {
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
      
      if (files.length > 0) {
        await Promise.all(files.map(file => file.delete()));
        summary.storageFilesDeleted = files.length;
      }
    } catch (error: any) {
      summary.errors.push(`Storage: ${error.message}`);
    }

    // Delete user document
    try {
      await db.collection('users').doc(uid).delete();
      summary.userDeleted = true;
    } catch (error: any) {
      summary.errors.push(`User: ${error.message}`);
    }

  } catch (error: any) {
    summary.errors.push(`General: ${error.message}`);
  }

  return summary;
}

async function deleteOrphanedUsersWithDocuments() {
  try {
    console.log('\n🗑️  Deleting orphaned users and their associated documents...\n');
    
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
    
    console.log(`📋 Found ${orphanedUsers.length} orphaned users to delete:\n`);
    orphanedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.uid} - ${user.email || 'N/A'} (${user.displayName || 'N/A'})`);
    });
    console.log('');
    
    console.log('🗑️  Starting deletion process...\n');
    
    const results: DeletionSummary[] = [];
    
    // Delete each user and their data
    for (let i = 0; i < orphanedUsers.length; i++) {
      const user = orphanedUsers[i];
      console.log(`[${i + 1}/${orphanedUsers.length}] Processing: ${user.uid} (${user.email || 'N/A'})`);
      
      const summary = await deleteUserAndData(user.uid);
      results.push(summary);
      
      // Show deletion results
      const totalDeleted = summary.documentsDeleted + summary.emailsDeleted + summary.packagesDeleted + summary.storageFilesDeleted;
      
      if (summary.userDeleted) {
        console.log(`   ✅ User deleted`);
        if (totalDeleted > 0) {
          console.log(`   ✅ Associated data deleted: ${summary.documentsDeleted} documents, ${summary.emailsDeleted} emails, ${summary.packagesDeleted} packages, ${summary.storageFilesDeleted} storage files`);
        } else {
          console.log(`   ✅ No associated data found`);
        }
      } else {
        console.log(`   ⚠️  User deletion failed`);
      }
      
      if (summary.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${summary.errors.join(', ')}`);
      }
      
      console.log('');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Final summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const successfulDeletions = results.filter(r => r.userDeleted);
    const failedDeletions = results.filter(r => !r.userDeleted);
    
    const totalDocuments = results.reduce((sum, r) => sum + r.documentsDeleted, 0);
    const totalEmails = results.reduce((sum, r) => sum + r.emailsDeleted, 0);
    const totalPackages = results.reduce((sum, r) => sum + r.packagesDeleted, 0);
    const totalStorageFiles = results.reduce((sum, r) => sum + r.storageFilesDeleted, 0);
    
    console.log(`Total users processed: ${results.length}`);
    console.log(`✅ Successfully deleted: ${successfulDeletions.length}`);
    console.log(`❌ Failed: ${failedDeletions.length}`);
    console.log('');
    console.log(`Total data deleted:`);
    console.log(`   📄 Documents: ${totalDocuments}`);
    console.log(`   📧 Emails: ${totalEmails}`);
    console.log(`   📦 Packages: ${totalPackages}`);
    console.log(`   💾 Storage files: ${totalStorageFiles}`);
    console.log('');
    
    if (failedDeletions.length > 0) {
      console.log('❌ Failed deletions:\n');
      failedDeletions.forEach(result => {
        console.log(`   - ${result.uid} (${result.email || 'N/A'}): ${result.errors.join(', ')}`);
      });
      console.log('');
    }
    
    if (successfulDeletions.length > 0) {
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
deleteOrphanedUsersWithDocuments()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });


