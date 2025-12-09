import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth-admin';

export const runtime = 'nodejs' as const;

export async function GET(request: NextRequest) {
  try {
    // Get user UID from query parameters
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'UID is required',
          isAdmin: false 
        },
        { status: 400 }
      );
    }
    
    const hasAdminAccess = await isAdmin(uid);
    
    return NextResponse.json({
      success: true,
      isAdmin: hasAdminAccess,
      userId: uid
    });

  } catch (error: any) {
    console.error('Error verificando permisos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        isAdmin: false 
      },
      { status: 500 }
    );
  }
}


