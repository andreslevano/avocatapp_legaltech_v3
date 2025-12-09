/**
 * Script to check Firebase Authentication users and compare with Firestore users collection
 * Lists all users that exist in Auth but don't have a document in Firestore
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/check-missing-users.ts
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

async function checkMissingUsers() {
  try {
    console.log('\n🔍 Checking for users missing in Firestore...\n');
    
    // Get all users from Firebase Auth
    console.log('📋 Fetching users from Firebase Authentication...');
    const authUsers = await auth.listUsers();
    console.log(`✅ Found ${authUsers.users.length} users in Firebase Authentication\n`);
    
    // Get all user documents from Firestore
    console.log('📋 Fetching users from Firestore...');
    const firestoreUsersSnapshot = await db.collection('users').get();
    const firestoreUserIds = new Set(firestoreUsersSnapshot.docs.map(doc => doc.id));
    console.log(`✅ Found ${firestoreUserIds.size} user documents in Firestore\n`);
    
    // Find users that exist in Auth but not in Firestore
    const missingUsers: Array<{
      uid: string;
      email: string | undefined;
      displayName: string | undefined;
      createdAt: string | undefined;
      lastSignIn: string | undefined;
      disabled: boolean;
    }> = [];
    
    for (const authUser of authUsers.users) {
      if (!firestoreUserIds.has(authUser.uid)) {
        missingUsers.push({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName || undefined,
          createdAt: authUser.metadata.creationTime,
          lastSignIn: authUser.metadata.lastSignInTime || undefined,
          disabled: authUser.disabled || false
        });
      }
    }
    
    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total users in Firebase Auth: ${authUsers.users.length}`);
    console.log(`Total user documents in Firestore: ${firestoreUserIds.size}`);
    console.log(`Users missing in Firestore: ${missingUsers.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (missingUsers.length === 0) {
      console.log('✅ All users in Firebase Authentication have corresponding documents in Firestore!\n');
      return;
    }
    
    console.log('❌ USERS MISSING IN FIRESTORE:\n');
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ UID                                      │ Email                        │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');
    
    missingUsers.forEach((user, index) => {
      const uid = user.uid.length > 40 ? user.uid.substring(0, 37) + '...' : user.uid.padEnd(40);
      const email = (user.email || 'N/A').padEnd(28);
      console.log(`│ ${uid} │ ${email} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');
    
    // Detailed list
    console.log('\n📋 DETAILED LIST:\n');
    missingUsers.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Created: ${user.createdAt || 'N/A'}`);
      console.log(`   Last Sign In: ${user.lastSignIn || 'Never'}`);
      console.log(`   Disabled: ${user.disabled ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Generate command to fix all users
    if (missingUsers.length > 0) {
      console.log('\n💡 To fix all missing users, run:');
      console.log('   npx ts-node --project tsconfig.scripts.json scripts/fix-missing-user.ts <UID>\n');
      console.log('   Or create a batch script to fix all at once.\n');
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
checkMissingUsers()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


