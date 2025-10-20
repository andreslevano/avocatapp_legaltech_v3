import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({
        success: false,
        error: 'UID is required'
      }, { status: 400 });
    }

    console.log(`🔄 Reactivating user account: ${uid}`);

    // Enable user in Firebase Authentication
    const admin = getAdmin();
    const auth = getAuth(admin);
    await auth.updateUser(uid, {
      disabled: false
    });

    console.log(`✅ User enabled in Firebase Auth: ${uid}`);

    // Update user status in Firestore
    const firestore = getFirestore(admin);
    const userRef = firestore.collection('users').doc(uid);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      console.log(`📝 Creating user document for reactivated user: ${uid}`);
      
      // Get user info from Firebase Auth
      const authUser = await auth.getUser(uid);
      let userData: any = {
        uid: uid,
        email: authUser.email,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reactivatedAt: new Date().toISOString()
      };
      
      if (authUser.displayName) userData.displayName = authUser.displayName;
      if (authUser.emailVerified !== undefined) userData.emailVerified = authUser.emailVerified;
      
      await userRef.set(userData);
      console.log(`✅ User document created for reactivated user: ${uid}`);
    } else {
      // Update existing user document
      await userRef.update({
        isActive: true,
        updatedAt: new Date().toISOString(),
        reactivatedAt: new Date().toISOString()
      });
      console.log(`✅ User status updated to active: ${uid}`);
    }

    console.log(`✅ User account reactivated successfully: ${uid}`);

    return NextResponse.json({
      success: true,
      message: 'Account reactivated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error reactivating user account:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
