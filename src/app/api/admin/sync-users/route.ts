import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase-admin';
// import { writeBatch, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

export const runtime = 'nodejs' as const;

interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime?: string;
  };
  customClaims?: Record<string, any>;
}

interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  role: string;
  subscription: {
    plan: 'free' | 'premium' | 'enterprise';
    startDate: string;
    endDate?: string;
    isActive: boolean;
  };
  preferences: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  stats: {
    totalDocuments: number;
    totalGenerations: number;
    totalSpent: number;
    lastGenerationAt?: string;
  };
}

export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 Starting user synchronization process...');
    
    // Step 1: Get all users from Firebase Authentication
    console.log('📋 Fetching users from Firebase Authentication...');
    const auth = getAuth();
    const listUsersResult = await auth.listUsers();
    const authUsers: AuthUser[] = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      },
      customClaims: user.customClaims
    }));

    console.log(`✅ Found ${authUsers.length} users in Firebase Authentication`);

    // Step 2: Get all existing users from Firestore
    console.log('📋 Fetching existing users from Firestore...');
    const firestoreUsersSnapshot = await db().collection('users').get();
    const existingFirestoreUsers = new Map<string, any>();
    
    firestoreUsersSnapshot.docs.forEach(doc => {
      existingFirestoreUsers.set(doc.id, { id: doc.id, ...doc.data() });
    });

    console.log(`✅ Found ${existingFirestoreUsers.size} existing users in Firestore`);

    // Step 3: Create/Update users in Firestore
    console.log('🔄 Syncing users to Firestore...');
    const batch = db().batch();
    const authUserUids = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;

    for (const authUser of authUsers) {
      authUserUids.add(authUser.uid);
      
      const existingUser = existingFirestoreUsers.get(authUser.uid);
      const userData: FirestoreUser = {
        uid: authUser.uid,
        email: authUser.email || '',
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        createdAt: authUser.metadata.creationTime,
        lastLoginAt: authUser.metadata.lastSignInTime || authUser.metadata.creationTime,
        isActive: !authUser.disabled,
        role: authUser.customClaims?.role || 'user',
        subscription: existingUser?.subscription || {
          plan: 'free',
          startDate: authUser.metadata.creationTime,
          isActive: true
        },
        preferences: existingUser?.preferences || {
          language: 'es',
          notifications: true,
          theme: 'light'
        },
        stats: existingUser?.stats || {
          totalDocuments: 0,
          totalGenerations: 0,
          totalSpent: 0
        }
      };

      const userRef = db().collection('users').doc(authUser.uid);
      
      if (existingUser) {
        // Update existing user
        batch.update(userRef, {
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          role: userData.role
        });
        updatedCount++;
      } else {
        // Create new user
        batch.set(userRef, userData);
        createdCount++;
      }
    }

    // Step 4: Delete orphaned users and their data
    console.log('🗑️ Cleaning up orphaned users...');
    const orphanedUsers: string[] = [];
    let deletedUsersCount = 0;
    let deletedDocumentsCount = 0;
    let deletedPurchasesCount = 0;
    let deletedAnalyticsCount = 0;

    for (const [uid, _userData] of existingFirestoreUsers) {
      if (!authUserUids.has(uid)) {
        orphanedUsers.push(uid);
        console.log(`🗑️ Marking user ${uid} for deletion (not in Auth)`);
      }
    }

    // Delete orphaned users and their related data
    for (const uid of orphanedUsers) {
      try {
        // Delete user's documents
        const documentsSnapshot = await db()
          .collection('users')
          .doc(uid)
          .collection('documents')
          .get();
        
        for (const docSnapshot of documentsSnapshot.docs) {
          await docSnapshot.ref.delete();
          deletedDocumentsCount++;
        }

        // Delete user's purchases
        const purchasesSnapshot = await db()
          .collection('purchases')
          .where('userId', '==', uid)
          .get();
        
        for (const purchaseSnapshot of purchasesSnapshot.docs) {
          await purchaseSnapshot.ref.delete();
          deletedPurchasesCount++;
        }

        // Delete user's analytics
        const analyticsSnapshot = await db()
          .collection('analytics')
          .doc('users')
          .collection(uid)
          .get();
        
        for (const analyticsDoc of analyticsSnapshot.docs) {
          await analyticsDoc.ref.delete();
          deletedAnalyticsCount++;
        }

        // Delete user's emails
        const emailsSnapshot = await db()
          .collection('users')
          .doc(uid)
          .collection('emails')
          .get();
        
        for (const emailDoc of emailsSnapshot.docs) {
          await emailDoc.ref.delete();
        }

        // Delete the user document itself
        await db().collection('users').doc(uid).delete();
        deletedUsersCount++;

        console.log(`✅ Deleted user ${uid} and all related data`);
      } catch (error) {
        console.error(`❌ Error deleting user ${uid}:`, error);
      }
    }

    // Commit the batch for user creation/updates
    await batch.commit();

    // Step 5: Update user references in other collections
    console.log('🔗 Updating user references in other collections...');
    
    // Update document references
    const documentsSnapshot = await db().collection('documents').get();
    for (const docSnapshot of documentsSnapshot.docs) {
      const docData = docSnapshot.data();
      if (docData.userId && !authUserUids.has(docData.userId)) {
        console.log(`🗑️ Deleting orphaned document ${docSnapshot.id} (user ${docData.userId} not in Auth)`);
        await docSnapshot.ref.delete();
        deletedDocumentsCount++;
      }
    }

    // Update purchase references
    const purchasesSnapshot = await db().collection('purchases').get();
    for (const purchaseSnapshot of purchasesSnapshot.docs) {
      const purchaseData = purchaseSnapshot.data();
      if (purchaseData.userId && !authUserUids.has(purchaseData.userId)) {
        console.log(`🗑️ Deleting orphaned purchase ${purchaseSnapshot.id} (user ${purchaseData.userId} not in Auth)`);
        await purchaseSnapshot.ref.delete();
        deletedPurchasesCount++;
      }
    }

    // Update email references
    const emailsSnapshot = await db().collection('generated_emails').get();
    for (const emailSnapshot of emailsSnapshot.docs) {
      const emailData = emailSnapshot.data();
      if (emailData.userId && !authUserUids.has(emailData.userId)) {
        console.log(`🗑️ Deleting orphaned email ${emailSnapshot.id} (user ${emailData.userId} not in Auth)`);
        await emailSnapshot.ref.delete();
      }
    }

    const result = {
      success: true,
      summary: {
        authUsers: authUsers.length,
        firestoreUsersBefore: existingFirestoreUsers.size,
        created: createdCount,
        updated: updatedCount,
        deleted: {
          users: deletedUsersCount,
          documents: deletedDocumentsCount,
          purchases: deletedPurchasesCount,
          analytics: deletedAnalyticsCount
        },
        orphanedUsers: orphanedUsers
      }
    };

    console.log('✅ User synchronization completed successfully');
    console.log('📊 Summary:', result.summary);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error during user synchronization:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Error during user synchronization',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(_request: NextRequest) {
  try {
    console.log('📊 Checking sync status...');
    
    // Get auth users count
    const auth = getAuth();
    const authUsers = await auth.listUsers();
    
    // Get firestore users count
    const firestoreUsersSnapshot = await db().collection('users').get();
    
    // Get orphaned users (in Firestore but not in Auth)
    const authUserUids = new Set(authUsers.users.map(user => user.uid));
    const orphanedUsers: string[] = [];
    
    firestoreUsersSnapshot.docs.forEach(doc => {
      if (!authUserUids.has(doc.id)) {
        orphanedUsers.push(doc.id);
      }
    });

    return NextResponse.json({
      success: true,
      status: {
        authUsers: authUsers.users.length,
        firestoreUsers: firestoreUsersSnapshot.size,
        orphanedUsers: orphanedUsers.length,
        orphanedUserIds: orphanedUsers
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Error checking sync status',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

