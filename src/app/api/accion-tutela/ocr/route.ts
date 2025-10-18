import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  // const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      console.error(`❌ Rate limit exceeded for ${clientIP}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Espera un momento antes de volver a procesar',
            hint: `Intenta de nuevo en ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} segundos`
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      );
    }

    // Verificar Content-Type
    const contentType = request.headers.get('content-type');
    
    let files: File[] = [];
    
    if (contentType?.includes('multipart/form-data')) {
      // Obtener el FormData
      const formData = await request.formData();
      files = formData.getAll('files') as File[];
    } else if (contentType?.includes('application/json')) {
      // Manejar JSON para pruebas
      const body = await request.json();
      if (body.files && Array.isArray(body.files)) {
        // Simular archivos para pruebas
        files = body.files.map((fileData: any) => ({
          name: fileData.name || 'test.pdf',
          size: fileData.size || 1024,
          type: fileData.type || 'application/pdf',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        })) as File[];
      }
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No se encontraron archivos para procesar',
            hint: 'Selecciona al menos un archivo PDF'
          }
        },
        { status: 400 }
      );
    }

    // Validar archivos
    const validFiles = files.filter(file => {
      return file.type === 'application/pdf' && file.size > 0 && file.size <= 10 * 1024 * 1024; // 10MB max
    });

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILES',
            message: 'Archivos inválidos',
            hint: 'Solo se permiten archivos PDF de máximo 10MB'
          }
        },
        { status: 400 }
      );
    }

    // Procesar archivos (simulación de OCR)
    const processedFiles = await Promise.all(
      validFiles.map(async (file, index) => {
        // const buffer = await file.arrayBuffer();
        // const base64 = Buffer.from(buffer).toString('base64');
        
        // Simulación de extracción de datos (en producción usarías un servicio OCR real)
        const extractedData = {
          filename: file.name,
          type: file.type,
          extractedText: `[TEXTO EXTRAÍDO DEL PDF ${index + 1}]\n\nEste es un texto simulado extraído del documento PDF. En una implementación real, aquí aparecería el texto extraído por OCR del documento escaneado.\n\nDatos simulados:\n- Vulnerador: [Nombre extraído del documento]\n- Hechos: [Descripción de hechos extraída]\n- Derecho vulnerado: [Derecho identificado]\n- Peticiones: [Solicitudes identificadas]`,
          confidence: 0.85 + (Math.random() * 0.1), // Simulación de confianza
          pages: Math.floor(Math.random() * 5) + 1, // Simulación de páginas
          language: 'es',
          processingTime: Math.random() * 2000 + 1000 // 1-3 segundos
        };

        return {
          id: uuidv4(),
          originalName: file.name,
          size: file.size,
          ...extractedData
        };
      })
    );

    const totalProcessingTime = Date.now() - startTime;
    
    console.log(`✅ OCR completado: ${processedFiles.length} archivos procesados en ${totalProcessingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        files: processedFiles,
        summary: {
          totalFiles: processedFiles.length,
          totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
          averageConfidence: processedFiles.reduce((sum, file) => sum + file.confidence, 0) / processedFiles.length,
          processingTime: totalProcessingTime
        }
      }
    });

  } catch (error) {
    // const elapsedMs = Date.now() - startTime;
    console.error(`❌ Error en OCR:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Error procesando los archivos',
          hint: 'Intenta de nuevo o contacta soporte si el problema persiste'
        }
      },
      { status: 500 }
    );
  }
}

