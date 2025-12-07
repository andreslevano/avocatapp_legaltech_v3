import { NextRequest, NextResponse } from 'next/server';
import { processMultipleDocuments } from '@/lib/ocr-analyzer';
import { apiLogger } from '@/lib/logger';
import { saveUploadedFile, signedUrlForUploadedFile } from '@/lib/storage';
import { saveUploadedFilesToFirestore } from '@/lib/simple-storage';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = formData.get('userId') as string;
    const reclId = formData.get('reclId') as string;
    
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No se proporcionaron archivos',
            hint: 'Incluye al menos un archivo PDF'
          }
        },
        { status: 400 }
      );
    }
    
    // Convertir archivos a buffers
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        contentType: file.type
      }))
    );
    
    console.log('OCR analysis request', {
      fileCount: files.length,
      filenames: files.map(f => f.name),
      userId: userId || 'no-user',
      reclId: reclId || 'no-recl'
    });
    
    // PRIMERO: Procesar documentos con OCR (necesitamos los resultados para guardar en Firestore)
    console.log('🔍 Procesando documentos con OCR...');
    let resultados: any[] = [];
    try {
      resultados = await processMultipleDocuments(fileBuffers.map(f => ({ buffer: f.buffer, filename: f.filename })));
      console.log(`✅ OCR completado: ${resultados.length} documentos procesados`);
    } catch (ocrError: any) {
      console.warn('⚠️ Error en OCR, continuando con metadatos básicos:', ocrError.message);
      // Crear resultados básicos para que el flujo continúe
      resultados = fileBuffers.map(f => ({
        nombre: f.filename,
        contenido: `[OCR no disponible: ${ocrError.message}]`,
        precision: 0,
        cantidadDetectada: undefined,
        fechaDetectada: undefined,
        tipoDocumento: 'otro' as const
      }));
    }
    
    // SEGUNDO: Guardar archivos en Storage Y Firestore si userId y reclId están disponibles
    // NOTA: Si el bucket no existe, guardamos solo en Firestore (metadatos)
    const savedFiles: Array<{ 
      fileName: string; 
      storagePath?: string; 
      downloadUrl?: string; 
      size?: number;
      contentType?: string;
      extractedText?: string;
      confidence?: number;
    }> = [];
    
    if (userId && reclId) {
      try {
        console.log(`💾 Intentando guardar ${fileBuffers.length} archivos en Storage...`);
        console.log(`📦 Bucket configurado: ${process.env.FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.appspot.com'}`);
        
        for (const fileData of fileBuffers) {
          try {
            const saveResult = await saveUploadedFile(
              userId,
              reclId,
              fileData.filename,
              fileData.buffer,
              {
                contentType: fileData.contentType || 'application/pdf',
                metadata: {
                  originalName: fileData.filename,
                  uploadedForOcr: true
                }
              }
            );
            
            // Generar URL firmada para descarga
            let downloadUrl: string | undefined;
            try {
              downloadUrl = await signedUrlForUploadedFile(
                userId,
                reclId,
                fileData.filename,
                { expiresMinutes: 60 * 24 * 7 } // 7 días
              );
            } catch (urlError: any) {
              console.warn(`⚠️ Error generando URL para ${fileData.filename}:`, urlError.message);
            }
            
            savedFiles.push({
              fileName: fileData.filename,
              storagePath: saveResult.storagePath,
              downloadUrl: downloadUrl
            });
            
            console.log(`✅ Archivo guardado: ${fileData.filename} -> ${saveResult.storagePath}`);
          } catch (fileError: any) {
            // Si el error es que el bucket no existe, no es crítico - continuamos
            if (fileError.message.includes('no existe') || fileError.message.includes('not exist')) {
              console.warn(`⚠️ Bucket de Storage no disponible para ${fileData.filename}. Continuando sin guardar en Storage.`);
              console.warn(`💡 Para habilitar el guardado de archivos, crea el bucket en Firebase Console o habilita Storage en tu proyecto.`);
              break; // Salir del loop si el bucket no existe
            } else {
              console.error(`❌ Error guardando archivo ${fileData.filename}:`, fileError.message);
              // Continuar con el siguiente archivo para otros errores
            }
          }
        }
        
        if (savedFiles.length > 0) {
          console.log(`✅ ${savedFiles.length}/${fileBuffers.length} archivos guardados exitosamente en Storage`);
        } else {
          console.warn(`⚠️ No se pudieron guardar archivos en Storage (el bucket puede no existir o no tener permisos)`);
          console.warn(`💡 Guardando solo metadatos en Firestore...`);
        }
      } catch (saveError: any) {
        // Error no crítico - continuamos
        console.warn('⚠️ Error general guardando archivos en Storage:', saveError.message);
        console.warn('💡 Continuando con guardado en Firestore...');
      }
      
      // SIEMPRE guardar metadatos en Firestore, incluso si Storage falló
      try {
        // Preparar datos de archivos con texto OCR extraído (ahora tenemos resultados)
        const filesForFirestore = fileBuffers.map((fileData, index) => {
          const savedFile = savedFiles.find(f => f.fileName === fileData.filename);
          const ocrResult = resultados[index];
          
          return {
            fileName: fileData.filename,
            storagePath: savedFile?.storagePath,
            downloadUrl: savedFile?.downloadUrl,
            size: fileData.buffer.length,
            contentType: fileData.contentType || 'application/pdf',
            extractedText: ocrResult?.text || '',
            confidence: ocrResult?.precision || 0
          };
        });
        
        await saveUploadedFilesToFirestore(userId, reclId, filesForFirestore);
        console.log(`✅ Metadatos de ${filesForFirestore.length} archivos guardados en Firestore`);
      } catch (firestoreError: any) {
        console.error(`❌ Error guardando metadatos en Firestore:`, firestoreError.message);
        // No es crítico, continuamos
      }
    } else {
      console.log('⚠️ userId o reclId no disponibles, archivos no se guardarán');
    }
    
    // Asociar archivos guardados con los resultados del OCR
    const resultadosConArchivos = resultados.map((resultado, index) => ({
      ...resultado,
      storageInfo: savedFiles[index] || null
    }));
    
    const elapsedMs = Date.now() - startTime;
    
    apiLogger.success(requestId, {
      documentsProcessed: resultados.length,
      averagePrecision: resultados.reduce((acc, doc) => acc + doc.precision, 0) / resultados.length,
      elapsedMs,
      filesSaved: savedFiles.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        documentos: resultadosConArchivos,
        uploadedFiles: savedFiles, // Información de archivos guardados
        metadata: {
          totalDocuments: resultados.length,
          averagePrecision: Math.round(resultados.reduce((acc, doc) => acc + doc.precision, 0) / resultados.length),
          elapsedMs,
          filesSaved: savedFiles.length
        }
      }
    });
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, error, { elapsedMs });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OCR_ANALYSIS_FAILED',
          message: 'Error analizando documentos',
          hint: 'Verifica que los archivos sean PDFs válidos'
        }
      },
      { status: 500 }
    );
  }
}
