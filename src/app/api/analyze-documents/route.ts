import { NextRequest, NextResponse } from 'next/server';
import { processMultipleDocuments } from '@/lib/ocr-analyzer';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
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
        filename: file.name
      }))
    );
    
    console.log('OCR analysis request', {
      fileCount: files.length,
      filenames: files.map(f => f.name)
    });
    
    // Procesar documentos con OCR
    const resultados = await processMultipleDocuments(fileBuffers);
    
    const elapsedMs = Date.now() - startTime;
    
    apiLogger.success(requestId, {
      documentsProcessed: resultados.length,
      averagePrecision: resultados.reduce((acc, doc) => acc + doc.precision, 0) / resultados.length,
      elapsedMs
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        documentos: resultados,
        metadata: {
          totalDocuments: resultados.length,
          averagePrecision: Math.round(resultados.reduce((acc, doc) => acc + doc.precision, 0) / resultados.length),
          elapsedMs
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
