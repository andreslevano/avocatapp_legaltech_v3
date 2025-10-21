import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    console.log(`🔍 Checking user status for email: ${email}`);

    // Get user by email from Firebase Auth
    const admin = getAdmin();
    const auth = getAuth(admin);
    const userRecord = await auth.getUserByEmail(email);
    
    if (!userRecord) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const uid = userRecord.uid;

    // Check user document in Firestore
    const firestore = getFirestore(admin);
    const userDoc = await firestore.collection('users').doc(uid).get();

    let isActive = true; // Default to active

    if (userDoc.exists) {
      const userData = userDoc.data();
      isActive = userData?.isActive !== false;
    } else {
      // If user document doesn't exist, create it
      console.log(`📝 Creating user document for: ${uid}`);
      
      let userData: any = {
        uid: uid,
        email: userRecord.email,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (userRecord.displayName) userData.displayName = userRecord.displayName;
      if (userRecord.emailVerified !== undefined) userData.emailVerified = userRecord.emailVerified;
      
      await firestore.collection('users').doc(uid).set(userData);
      console.log(`✅ User document created successfully: ${uid}`);
    }

    console.log(`✅ User status checked: ${email} -> isActive: ${isActive}`);

    return NextResponse.json({
      success: true,
      uid: uid,
      isActive: isActive,
      email: userRecord.email,
      displayName: userRecord.displayName
    });

  } catch (error: any) {
    console.error('❌ Error checking user status:', error);
    
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
