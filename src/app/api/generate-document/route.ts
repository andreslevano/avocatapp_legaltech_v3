import { NextRequest, NextResponse } from 'next/server';
import { generateDocument } from '@/lib/openai';
import { GenerateDocumentSchema } from '@/lib/validate';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateAreaSpecificPDF } from '@/lib/pdf-generator';

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
    const validationResult = GenerateDocumentSchema.safeParse(body);
    
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
    
    // Log request
    apiLogger.generateDocument(requestId, {
      areaLegal: data.areaLegal,
      tipoEscrito: data.tipoEscrito,
      tono: data.tono,
      plantillaId: data.plantillaId
    });

    // Generar documento
    const result = await generateDocument(data);
    const elapsedMs = Date.now() - startTime;
    
    // Log success
    apiLogger.success(requestId, {
      tokensUsed: result.tokensUsed,
      model: result.model,
      elapsedMs
    });

    // Generar PDF profesional
    const pdfDoc = generateAreaSpecificPDF(
      data.areaLegal,
      data.tipoEscrito,
      result.content,
      data.datosCliente
    );
    
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const filename = `${data.tipoEscrito.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        filename,
        mime: 'application/pdf',
        content: result.content,
        pdfBase64: pdfBase64,
        tokensUsed: result.tokensUsed,
        model: result.model,
        elapsedMs
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
          message: 'Error generando el documento',
          hint: 'Intenta de nuevo o contacta soporte si el problema persiste'
        }
      },
      { status: 500 }
    );
  }
}
