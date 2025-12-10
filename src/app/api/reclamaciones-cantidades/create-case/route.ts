import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/reclamaciones-cantidades/create-case
 * Crea un nuevo caso de reclamación de cantidades
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'uid es requerido' },
        { status: 400 }
      );
    }

    // Generar caseId único
    const caseId = `recl_${Date.now()}_${uuidv4().substr(0, 8)}`;

    // Crear documento en Firestore
    const caseRef = doc(collection(db as any, 'users'), uid, 'reclamaciones_cantidades', caseId);

    const caseData = {
      id: caseId,
      uid,
      status: 'draft' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      payment: {
        status: 'not_started' as const,
      },
      storage: {
        inputFiles: [],
        finalPdf: {
          path: null,
          url: null,
          generatedAt: null,
        },
      },
      legalMeta: {
        jurisdiction: 'España',
        tipoProcedimiento: 'Reclamación de Cantidades',
        versionPrompt: '1.0',
        abogadoVirtual: 'OpenAI ChatGPT',
      },
    };

    await setDoc(caseRef, caseData);

    console.log(`✅ Caso creado: ${caseId} para usuario ${uid}`);

    return NextResponse.json({
      success: true,
      caseId,
      case: caseData,
    });
  } catch (error: any) {
    console.error('❌ Error creando caso:', error);
    return NextResponse.json(
      { error: 'Error al crear el caso', details: error.message },
      { status: 500 }
    );
  }
}

