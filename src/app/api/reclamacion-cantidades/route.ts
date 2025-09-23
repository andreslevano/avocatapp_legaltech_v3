import { NextRequest, NextResponse } from 'next/server';
import { ReclamacionCantidadSchema } from '@/lib/validate-reclamacion';
import { generateReclamacionCantidad } from '@/lib/openai-reclamacion';
import { renderReclamacionPDF } from '@/lib/pdf/reclamacion-simple';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiLogger } from '@/lib/logger';
import { agregarAlHistorial } from '@/lib/historial';
import { v4 as uuidv4 } from 'uuid';

// Funciones auxiliares para calcular cuantía y precisión desde OCR
function calcularCuantiaDesdeOCR(ocr: any): number {
  if (ocr.summary?.totalDetected) {
    return ocr.summary.totalDetected;
  }
  
  let total = 0;
  ocr.files.forEach((file: any) => {
    if (file.amounts) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          total += amount.value;
        }
      });
    }
  });
  
  return total > 0 ? total : 0;
}

function calcularPrecisionDesdeOCR(ocr: any): number {
  if (ocr.summary?.confidence) {
    return Math.round(ocr.summary.confidence * 100);
  }
  
  let totalValue = 0;
  let weightedConfidence = 0;
  
  ocr.files.forEach((file: any) => {
    if (file.amounts && file.amounts.length > 0) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          const confidence = amount.confidence || file.confidence || 0.6;
          totalValue += amount.value;
          weightedConfidence += amount.value * confidence;
        }
      });
    }
  });
  
  if (totalValue > 0) {
    return Math.round((weightedConfidence / totalValue) * 100);
  }
  
  return 60; // Precisión por defecto
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      apiLogger.error(requestId, new Error('Rate limit exceeded'), { clientIP });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Espera un momento antes de volver a generar',
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

    // Validar payload
    const body = await request.json();
    const validationResult = ReclamacionCantidadSchema.safeParse(body);
    
    if (!validationResult.success) {
      apiLogger.error(requestId, new Error('Validation failed'), { 
        errors: validationResult.error.errors 
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos',
            hint: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          }
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    
    // Calcular cuantía y precisión desde OCR
    const cuantia = data.cuantiaOverride || calcularCuantiaDesdeOCR(data.ocr);
    const precision = calcularPrecisionDesdeOCR(data.ocr);
    
    // Log request
    apiLogger.info(requestId, 'Reclamacion request', {
      acreedor: data.acreedor.nombre,
      deudor: data.deudor.nombre,
      cuantia,
      precision,
      viaPreferida: data.viaPreferida,
      documentosOCR: data.ocr.files.length
    });

    // Generar reclamación
    const model = await generateReclamacionCantidad(data);
    
    // Generar PDF
    const pdfBuffer = await renderReclamacionPDF(model, cuantia, precision);
    
    // Agregar al historial
    const historialItem = agregarAlHistorial({
      fechaISO: new Date().toISOString(),
      titulo: 'reclamacion_cantidades',
      documentos: data.ocr.files.length,
      precision,
      precio: 10,
      cuantia,
      estado: 'Completado',
      cauceRecomendado: model.cauceRecomendado
    });
    
    const elapsedMs = Date.now() - startTime;
    
    apiLogger.success(requestId, {
      cauceRecomendado: model.cauceRecomendado,
      jurisdiccion: model.jurisdiccion,
      cuantia,
      precision,
      historialId: historialItem.id,
      elapsedMs
    });

    // Generar nombre de archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `reclamacion-cantidad-${data.acreedor.nombre.replace(/\s+/g, '_')}-${timestamp}.pdf`;

    // Devolver PDF
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Request-ID': requestId,
        'X-Cauce-Recomendado': model.cauceRecomendado,
        'X-Jurisdiccion': model.jurisdiccion
      }
    });

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, error, { elapsedMs });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Error generando la reclamación de cantidad',
          hint: 'Intenta de nuevo o contacta soporte si el problema persiste'
        }
      },
      { status: 500 }
    );
  }
}
