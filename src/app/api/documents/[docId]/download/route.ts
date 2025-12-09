import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { storage } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const docId = params.docId;

    if (!uid || !docId) {
      return NextResponse.json(
        { error: 'uid y docId son requeridos' },
        { status: 400 }
      );
    }

    console.log(`📥 Descargando documento: ${docId} para usuario: ${uid}`);

    // Obtener documento de Firestore
    const docRef = db().collection('documents').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const document = docSnap.data();

    // Verificar que el documento pertenece al usuario
    if (document?.userId !== uid) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener ruta de Storage
    const storagePath = document?.storage?.storagePath || `users/${uid}/documents/${docId}.pdf`;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.appspot.com';

    console.log(`📂 Ruta de Storage: ${storagePath}`);

    // Descargar archivo de Storage
    const bucket = storage().bucket(bucketName);
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    let buffer: Buffer;
    let filename = document?.filename || `documento-${docId}.pdf`;

    if (!exists) {
      console.log('⚠️ PDF no existe en Storage, regenerando desde datos OCR y perfil del usuario...');
      
      // Obtener datos de entrada y perfil del usuario
      const inputData = document?.content?.inputData;
      let content = document?.content?.generatedContent;
      
      if (!content && inputData) {
        // Obtener perfil del usuario
        let userProfile: any = null;
        try {
          const userDoc = await db().collection('users').doc(uid).get();
          if (userDoc.exists) {
            userProfile = { uid: userDoc.id, ...userDoc.data() };
            console.log(`✅ Perfil del usuario obtenido: ${userProfile.email}`);
          }
        } catch (error: any) {
          console.warn('⚠️ Error obteniendo perfil del usuario:', error.message);
        }
        
        // Regenerar contenido usando el mismo proceso que en /api/reclamacion-cantidades
        try {
          const { buildUserPrompt } = await import('@/lib/prompts/reclamacion_cantidades_co');
          const { SYSTEM_PROMPT } = await import('@/lib/prompts/reclamacion_cantidades_co');
          const { getOpenAIClient } = await import('@/lib/openai-client');
          
          // Preparar contexto OCR si está disponible
          const hasOcrData = inputData.ocrFiles && inputData.ocrFiles.length > 0;
          const ocrContext = hasOcrData ? `
          
DATOS EXTRAÍDOS DE DOCUMENTOS (OCR):
${inputData.ocrFiles.map((file: any, index: number) => `
Documento ${index + 1}: ${file.originalName || `Documento ${index + 1}`}
Categoría: ${file.category || 'No especificada'}
Texto extraído: ${file.extractedText || 'No disponible'}
Confianza: ${file.confidence ? (file.confidence * 100).toFixed(1) + '%' : 'N/A'}
`).join('\n')}
` : '';
          
          const userPrompt = buildUserPrompt(inputData, userProfile) + ocrContext;
          
          const openaiClient = getOpenAIClient();
          const result = await openaiClient.generateContent(userPrompt, {
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.3,
            maxTokens: 3000
          });
          
          if (result.content) {
            // Parsear JSON
            try {
              content = JSON.parse(result.content);
              console.log('✅ Contenido regenerado exitosamente desde inputData');
            } catch (parseError) {
              const jsonMatch = result.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                content = JSON.parse(jsonMatch[0]);
                console.log('✅ Contenido regenerado (extraído de JSON)');
              } else {
                throw new Error('No se pudo extraer JSON válido');
              }
            }
          }
        } catch (regenerateError: any) {
          console.error('❌ Error regenerando contenido:', regenerateError);
          return NextResponse.json(
            { error: 'Error regenerando documento desde datos OCR', details: regenerateError.message },
            { status: 500 }
          );
        }
      }
      
      if (!content) {
        return NextResponse.json(
          { error: 'No se pudo regenerar el documento: contenido no disponible' },
          { status: 404 }
        );
      }
      
      // Generar PDF desde el contenido regenerado
      const { renderReclamacionCantidadesPDF } = await import('@/lib/pdf/reclamacion-cantidades');
      buffer = await renderReclamacionCantidadesPDF(content);
      
      // Guardar PDF regenerado en Storage
      try {
        const { savePdfForUser } = await import('@/lib/simple-storage');
        await savePdfForUser(uid, docId, buffer, {
          contentType: 'application/pdf',
          metadata: {
            userId: uid,
            docId,
            tipoEscrito: 'Reclamación de Cantidades',
            filename,
            regenerated: true
          }
        });
        console.log('✅ PDF regenerado y guardado en Storage');
      } catch (saveError: any) {
        console.warn('⚠️ Error guardando PDF regenerado:', saveError.message);
        // Continuar aunque falle el guardado
      }
    } else {
      // PDF existe, descargarlo
      buffer = (await file.download())[0];
      console.log(`✅ Archivo descargado: ${buffer.length} bytes`);
    }

    // Devolver PDF
    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('❌ Error descargando documento:', error);
    return NextResponse.json(
      { error: 'Error descargando documento', details: error.message },
      { status: 500 }
    );
  }
}

