import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * POST /api/reclamaciones-cantidades/register-upload
 * Registra archivos subidos en Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, uid, files } = body;

    if (!caseId || !uid || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'caseId, uid y files (array) son requeridos' },
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

    const caseData = caseDoc.data();
    const currentFiles = caseData.storage?.inputFiles || [];

    // Agregar nuevos archivos
    const newFiles = files.map((file: { path: string; fileName: string }) => ({
      fileName: file.fileName,
      path: file.path,
      uploadedAt: new Date().toISOString(),
    }));

    const updatedFiles = [...currentFiles, ...newFiles];

    // Actualizar Firestore
    await updateDoc(caseRef, {
      'storage.inputFiles': updatedFiles,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Archivos registrados en caso ${caseId}: ${newFiles.length} archivos`);

    return NextResponse.json({
      success: true,
      filesRegistered: newFiles.length,
      totalFiles: updatedFiles.length,
    });
  } catch (error: any) {
    console.error('❌ Error registrando archivos:', error);
    return NextResponse.json(
      { error: 'Error al registrar archivos', details: error.message },
      { status: 500 }
    );
  }
}

