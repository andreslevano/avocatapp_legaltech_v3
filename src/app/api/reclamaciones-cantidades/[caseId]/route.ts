import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * GET /api/reclamaciones-cantidades/[caseId]
 * Obtiene un caso de reclamación por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const caseId = params.caseId;
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { error: 'uid es requerido como query parameter' },
        { status: 400 }
      );
    }

    // Obtener caso de Firestore
    const caseRef = doc(db as any, 'users', uid, 'reclamaciones_cantidades', caseId);
    const caseDoc = await getDoc(caseRef);

    if (!caseDoc.exists()) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    const caseData = caseDoc.data();

    return NextResponse.json({
      success: true,
      case: {
        ...caseData,
        id: caseId,
      },
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo caso:', error);
    return NextResponse.json(
      { error: 'Error al obtener el caso', details: error.message },
      { status: 500 }
    );
  }
}

