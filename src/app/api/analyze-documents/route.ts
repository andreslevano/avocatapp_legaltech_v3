import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocumentOCR } from '@/lib/ocr-analyzer';
import { saveUploadedFile } from '@/lib/storage';

/**
 * POST /api/analyze-documents
 * Procesa OCR de archivos PDF subidos y los guarda en Storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = formData.get('userId') as string;
    const reclId = formData.get('reclId') as string | null;
    const tutelaId = formData.get('tutelaId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron archivos' },
        { status: 400 }
      );
    }

    if (!userId || userId === 'demo_user' || userId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    console.log(`🔍 Procesando OCR de ${files.length} archivos para usuario: ${userId}`);

    const uploadedFiles = [];
    const documentType = reclId ? 'reclamacion_cantidades' : tutelaId ? 'accion_tutela' : undefined;

    // Procesar cada archivo
    for (const file of files) {
      try {
        if (file.type !== 'application/pdf') {
          console.warn(`⚠️ Archivo ${file.name} no es PDF, saltando...`);
          continue;
        }

        console.log(`📄 Procesando OCR de: ${file.name}`);

        // Convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Procesar OCR
        const ocrResult = await analyzeDocumentOCR(buffer, file.name);

        console.log(`✅ OCR completado para ${file.name}:`, {
          precision: ocrResult.precision,
          caracteres: ocrResult.contenido.length,
          cantidadDetectada: ocrResult.cantidadDetectada,
          fechaDetectada: ocrResult.fechaDetectada,
          tipoDocumento: ocrResult.tipoDocumento
        });

        // Guardar archivo en Storage
        const storageResult = await saveUploadedFile(
          userId,
          file,
          ocrResult.tipoDocumento || 'otros',
          documentType
        );

        uploadedFiles.push({
          fileName: file.name,
          storagePath: storageResult.storagePath,
          downloadUrl: storageResult.downloadURL,
          fileId: storageResult.fileId,
          ocrText: ocrResult.contenido,
          ocrConfidence: ocrResult.precision,
          cantidadDetectada: ocrResult.cantidadDetectada,
          fechaDetectada: ocrResult.fechaDetectada,
          tipoDocumento: ocrResult.tipoDocumento,
          size: file.size
        });

      } catch (error: any) {
        console.error(`❌ Error procesando archivo ${file.name}:`, error);
        // Continuar con el siguiente archivo
      }
    }

    console.log(`✅ Procesados ${uploadedFiles.length} de ${files.length} archivos`);

    return NextResponse.json({
      success: true,
      data: {
        uploadedFiles,
        totalProcessed: uploadedFiles.length,
        totalReceived: files.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error en /api/analyze-documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error procesando documentos'
      },
      { status: 500 }
    );
  }
}


