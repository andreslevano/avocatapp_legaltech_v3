import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * PATCH /api/reclamaciones-cantidades/update-form-data
 * Actualiza los datos del formulario del usuario
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, uid, formData } = body;

    if (!caseId || !uid || !formData) {
      return NextResponse.json(
        { error: 'caseId, uid y formData son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el caso pertenece al usuario
    const caseRef = doc(db as any, 'users', uid, 'reclamaciones_cantidades', caseId);
    const caseDoc = await getDoc(caseRef);

    if (!caseDoc.exists()) {
      return NextResponse.json(
        { error: 'Caso no encontrado o no pertenece al usuario' },
        { status: 404 }
      );
    }

    // Actualizar formData en Firestore
    await updateDoc(caseRef, {
      formData,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ FormData actualizado para caso ${caseId}`);

    return NextResponse.json({
      success: true,
      message: 'Datos del formulario actualizados correctamente',
    });
  } catch (error: any) {
    console.error('❌ Error actualizando formData:', error);
    return NextResponse.json(
      { error: 'Error al actualizar datos del formulario', details: error.message },
      { status: 500 }
    );
  }
}

