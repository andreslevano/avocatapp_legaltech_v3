import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';

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

    console.log(`🔓 Enabling user in Firebase Auth: ${uid}`);

    // Enable user in Firebase Authentication
    const auth = getAuth();
    await auth.updateUser(uid, {
      disabled: false
    });

    console.log(`✅ User enabled in Firebase Auth: ${uid}`);

    return NextResponse.json({
      success: true,
      message: 'User enabled successfully'
    });

  } catch (error) {
    console.error('❌ Error enabling user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
