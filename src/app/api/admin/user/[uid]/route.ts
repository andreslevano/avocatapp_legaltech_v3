import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin-services';

export const runtime = 'nodejs' as const;

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  const { uid } = params;

  try {
    console.log('Admin: Fetching user details', { uid });
    
    const userSummary = await AdminService.getUserSummary(uid);
    
    if (!userSummary) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado',
            hint: 'Verifica que el UID del usuario sea correcto'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userSummary
    });
  } catch (error: any) {
    console.error('Admin: Error fetching user details', { uid, error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_ERROR',
          message: 'Error obteniendo detalles del usuario',
          hint: 'Verifica permisos de administrador'
        }
      },
      { status: 500 }
    );
  }
}