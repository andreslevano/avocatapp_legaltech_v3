import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking user status: ${uid}`);

    const firestore = db();
    const userDoc = await firestore.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const isActive = userData?.isActive !== false; // Default to true if not set

    console.log(`✅ User status retrieved: ${uid} -> isActive: ${isActive}`);

    return NextResponse.json({
      success: true,
      isActive: isActive,
      userData: {
        email: userData?.email,
        displayName: userData?.displayName,
        isActive: isActive,
        createdAt: userData?.createdAt,
        updatedAt: userData?.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error checking user status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
