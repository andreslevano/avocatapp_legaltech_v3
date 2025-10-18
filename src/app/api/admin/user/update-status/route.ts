import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, isActive } = body;

    if (!uid || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'UID and isActive boolean are required' },
        { status: 400 }
      );
    }

    console.log(`📝 Updating user status: ${uid} -> isActive: ${isActive}`);

    const firestore = db();
    
    // Update user document in 'users' collection
    await firestore.collection('users').doc(uid).update({
      isActive: isActive,
      updatedAt: new Date().toISOString(),
      statusUpdatedAt: new Date().toISOString()
    });

    console.log(`✅ User status updated successfully: ${uid}`);

    return NextResponse.json({
      success: true,
      message: `User status updated to ${isActive ? 'active' : 'inactive'}`
    });

  } catch (error) {
    console.error('❌ Error updating user status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
