import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      );
    }

    console.log(`🔒 Disabling user in Firebase Auth: ${uid}`);

    // Disable user in Firebase Authentication
    const auth = getAuth();
    await auth.updateUser(uid, {
      disabled: true
    });

    console.log(`✅ User disabled in Firebase Auth: ${uid}`);

    return NextResponse.json({
      success: true,
      message: 'User disabled successfully'
    });

  } catch (error) {
    console.error('❌ Error disabling user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
