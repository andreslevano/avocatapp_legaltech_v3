import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth-admin';

export const runtime = 'nodejs' as const;

export async function GET(_request: NextRequest) {
  try {
    // En un entorno real, obtendrías el UID del token de autenticación
    const currentUserId = 'demo_admin_user'; // TODO: Obtener del contexto de autenticación
    
    const hasAdminAccess = await isAdmin(currentUserId);
    
    return NextResponse.json({
      success: true,
      isAdmin: hasAdminAccess,
      userId: currentUserId
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


