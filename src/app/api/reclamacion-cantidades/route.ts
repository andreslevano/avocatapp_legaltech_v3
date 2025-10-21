import { NextRequest, NextResponse } from 'next/server';
import { ReclamacionCantidadesRequestSchema, ReclamacionCantidadesModelSchema } from '@/lib/validate-reclamacion-cantidades';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/reclamacion_cantidades_co';
import { renderReclamacionCantidadesPDF } from '@/lib/pdf/reclamacion-cantidades';
import { checkRateLimit } from '@/lib/ratelimit';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIClient } from '@/lib/openai-client';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
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
    const validationResult = ReclamacionCantidadesRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error(`❌ Validation failed:`, validationResult.error.errors);
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
    // const uid = data.userId || 'demo_user';
    
    // Log request
    console.log(`📝 Generando Reclamación de Cantidades para ${data.nombreTrabajador}`, {
      trabajador: data.nombreTrabajador,
      empresa: data.nombreEmpresa,
      localidad: data.localidad
    });

    // Generar reclamación con ChatGPT
    const userPrompt = buildUserPrompt(data);
    
    console.log('🤖 Enviando prompt a ChatGPT...');
    const openaiClient = getOpenAIClient();
    const result = await openaiClient.generateContent(userPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 3000
    });

    const content = result.content;
    const timeMs = 0; // TODO: Get from result metadata when available
    const mock = false;

    if (!content) {
      throw new Error('No se recibió contenido del modelo');
    }

    // Parsear y validar JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // Si falla el parseo, intentar extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON válido de la respuesta');
      }
    }

    // Validar con Zod
    const modelValidation = ReclamacionCantidadesModelSchema.safeParse(parsedContent);
    
    if (!modelValidation.success) {
      // Reintentar una vez con prompt más específico
      const retryPrompt = userPrompt + '\n\nIMPORTANTE: Devuelve EXCLUSIVAMENTE JSON válido. No incluyas texto adicional, explicaciones ni formato Markdown. STRICT_JSON_ONLY.';
      
      const retryResult = await openaiClient.generateContent(retryPrompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3000
      });

      if (!retryResult.content) {
        throw new Error('No se recibió contenido en el reintento');
      }

      const retryParsed = JSON.parse(retryResult.content);
      const retryValidation = ReclamacionCantidadesModelSchema.safeParse(retryParsed);
      
      if (!retryValidation.success) {
        throw new Error(`Validación fallida en reintento: ${retryValidation.error.errors.map(e => e.message).join(', ')}`);
      }
      
      parsedContent = retryValidation.data;
    } else {
      parsedContent = modelValidation.data;
    }

    // Generar PDF
    const pdfBuffer = await renderReclamacionCantidadesPDF(parsedContent);
    
    const elapsedMs = Date.now() - startTime;
    
    console.log(`✅ Reclamación de Cantidades generada exitosamente`, {
      docId: requestId,
      trabajador: data.nombreTrabajador,
      empresa: data.nombreEmpresa,
      elapsedMs
    });

    // Devolver PDF directamente
    const filename = `reclamacion-cantidades-${data.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ Error generando Reclamación de Cantidades:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Error generando la reclamación de cantidades',
          hint: 'Intenta de nuevo o contacta soporte si el problema persiste'
        }
      },
      { status: 500 }
    );
  }
}