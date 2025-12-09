/**
 * Script to check Firestore users collection and compare with Firebase Authentication
 * Lists all users that exist in Firestore but NOT in Firebase Authentication
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/check-orphaned-users.ts
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

async function checkOrphanedUsers() {
  try {
    console.log('\n🔍 Checking for orphaned users in Firestore...\n');
    
    // Get all users from Firebase Auth
    console.log('📋 Fetching users from Firebase Authentication...');
    const authUsers = await auth.listUsers();
    const authUserIds = new Set(authUsers.users.map(user => user.uid));
    console.log(`✅ Found ${authUsers.users.length} users in Firebase Authentication\n`);
    
    // Get all user documents from Firestore
    console.log('📋 Fetching users from Firestore...');
    const firestoreUsersSnapshot = await db.collection('users').get();
    console.log(`✅ Found ${firestoreUsersSnapshot.docs.length} user documents in Firestore\n`);
    
    // Find users that exist in Firestore but not in Auth
    const orphanedUsers: Array<{
      uid: string;
      email: string | undefined;
      displayName: string | undefined;
      isAdmin: boolean;
      isActive: boolean;
      createdAt: any;
      lastLoginAt: any;
    }> = [];
    
    for (const doc of firestoreUsersSnapshot.docs) {
      const uid = doc.id;
      if (!authUserIds.has(uid)) {
        const userData = doc.data();
        orphanedUsers.push({
          uid: uid,
          email: userData.email,
          displayName: userData.displayName,
          isAdmin: userData.isAdmin || false,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt
        });
      }
    }
    
    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total users in Firebase Auth: ${authUsers.users.length}`);
    console.log(`Total user documents in Firestore: ${firestoreUsersSnapshot.docs.length}`);
    console.log(`Orphaned users in Firestore (not in Auth): ${orphanedUsers.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (orphanedUsers.length === 0) {
      console.log('✅ All user documents in Firestore have corresponding users in Firebase Authentication!\n');
      return;
    }
    
    console.log('⚠️  ORPHANED USERS IN FIRESTORE (NOT IN AUTH):\n');
    console.log('┌─────────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ UID                                      │ Email                        │ Admin │ Active │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤');
    
    orphanedUsers.forEach((user) => {
      const uid = user.uid.length > 40 ? user.uid.substring(0, 37) + '...' : user.uid.padEnd(40);
      const email = (user.email || 'N/A').padEnd(28);
      const admin = (user.isAdmin ? 'Yes' : 'No').padEnd(5);
      const active = (user.isActive ? 'Yes' : 'No').padEnd(6);
      console.log(`│ ${uid} │ ${email} │ ${admin} │ ${active} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────────────┘\n');
    
    // Detailed list
    console.log('\n📋 DETAILED LIST:\n');
    orphanedUsers.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Is Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   Is Active: ${user.isActive ? 'Yes' : 'No'}`);
      
      // Format dates
      let createdAtStr = 'N/A';
      let lastLoginStr = 'N/A';
      
      if (user.createdAt) {
        if (user.createdAt.toDate) {
          createdAtStr = user.createdAt.toDate().toISOString();
        } else if (user.createdAt instanceof Date) {
          createdAtStr = user.createdAt.toISOString();
        } else if (typeof user.createdAt === 'string') {
          createdAtStr = user.createdAt;
        } else {
          createdAtStr = JSON.stringify(user.createdAt);
        }
      }
      
      if (user.lastLoginAt) {
        if (user.lastLoginAt.toDate) {
          lastLoginStr = user.lastLoginAt.toDate().toISOString();
        } else if (user.lastLoginAt instanceof Date) {
          lastLoginStr = user.lastLoginAt.toISOString();
        } else if (typeof user.lastLoginAt === 'string') {
          lastLoginStr = user.lastLoginAt;
        } else {
          lastLoginStr = JSON.stringify(user.lastLoginAt);
        }
      }
      
      console.log(`   Created: ${createdAtStr}`);
      console.log(`   Last Login: ${lastLoginStr}`);
      console.log('');
    });
    
    // Analysis
    console.log('\n📊 ANALYSIS:\n');
    const adminOrphaned = orphanedUsers.filter(u => u.isAdmin).length;
    const activeOrphaned = orphanedUsers.filter(u => u.isActive).length;
    const inactiveOrphaned = orphanedUsers.filter(u => !u.isActive).length;
    
    console.log(`   Admin users: ${adminOrphaned}`);
    console.log(`   Active users: ${activeOrphaned}`);
    console.log(`   Inactive users: ${inactiveOrphaned}`);
    console.log('');
    
    console.log('💡 These user documents exist in Firestore but the corresponding user account');
    console.log('   has been deleted from Firebase Authentication. They may be:');
    console.log('   - Test/demo users that were cleaned up');
    console.log('   - Users that were manually deleted from Auth');
    console.log('   - Legacy data from previous migrations');
    console.log('');
    console.log('⚠️  Before deleting these documents, consider:');
    console.log('   - Checking if they have associated data (purchases, documents, etc.)');
    console.log('   - Backing up the data if needed');
    console.log('   - Verifying they are not needed for historical records');
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
checkOrphanedUsers()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


