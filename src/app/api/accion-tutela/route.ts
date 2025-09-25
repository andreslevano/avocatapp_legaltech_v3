import { NextRequest, NextResponse } from 'next/server';
import { TutelaRequestSchema, TutelaModelSchema } from '@/lib/validate-tutela';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/tutela_co';
import { renderTutelaPDF } from '@/lib/pdf/tutela';
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
    const validationResult = TutelaRequestSchema.safeParse(body);
    
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
    const uid = data.userId || 'demo_user';
    
    // Verificar si hay datos OCR para incluir en el prompt
    const hasOcrData = body.ocrFiles && body.ocrFiles.length > 0;
    const ocrContext = hasOcrData ? `
    
DATOS EXTRAÍDOS DE DOCUMENTOS:
${body.ocrFiles.map((file: any, index: number) => `
Documento ${index + 1}: ${file.originalName}
Texto extraído: ${file.extractedText}
Confianza: ${(file.confidence * 100).toFixed(1)}%
`).join('\n')}
` : '';
    
    // Log request
    console.log(`📝 Generando Tutela para ${data.vulnerador}`, {
      vulnerador: data.vulnerador,
      derecho: data.derecho,
      ciudad: data.ciudad,
      medidasProvisionales: data.medidasProvisionales
    });

    // Generar tutela con ChatGPT
    const userPrompt = buildUserPrompt(data) + ocrContext;
    
    console.log('🤖 Enviando prompt a ChatGPT...');
    const openaiClient = getOpenAIClient();
    const result = await openaiClient.generateContent(userPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 3000
    });

    const content = result.content;
    const timeMs = result.metadata?.processingTime || 0;
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
      let jsonContent = content;
      
      // Remover markdown si existe
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }
      } else if (content.includes('```')) {
        const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }
      } else {
        // Buscar JSON en el contenido
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
      }
      
      try {
        parsedContent = JSON.parse(jsonContent);
      } catch (secondError) {
        throw new Error(`No se pudo extraer JSON válido de la respuesta: ${secondError.message}`);
      }
    }

    // Validar con Zod
    const modelValidation = TutelaModelSchema.safeParse(parsedContent);
    
    if (!modelValidation.success) {
      // Reintentar una vez con prompt más específico
      const retryPrompt = userPrompt + '\n\nIMPORTANTE: Devuelve EXCLUSIVAMENTE JSON válido. No incluyas texto adicional, explicaciones ni formato Markdown. STRICT_JSON_ONLY.';
      
      const retryResult = await openaiClient.generateContent(retryPrompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3000
      });
      
      const retryContent = retryResult.content;

      if (!retryContent) {
        throw new Error('No se recibió contenido en el reintento');
      }

      const retryParsed = JSON.parse(retryContent);
      const retryValidation = TutelaModelSchema.safeParse(retryParsed);
      
      if (!retryValidation.success) {
        throw new Error(`Validación fallida en reintento: ${retryValidation.error.errors.map(e => e.message).join(', ')}`);
      }
      
      parsedContent = retryValidation.data;
    } else {
      parsedContent = modelValidation.data;
    }

    // Generar PDF
    const pdfBuffer = await renderTutelaPDF(parsedContent);
    
    // Persistir en Firebase Storage y Firestore
    const docId = uuidv4();
    
    try {
      // Guardar PDF en Storage
      const storageResult = await savePdfForUser(uid, docId, pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          userId: uid,
          docId,
          tipo: 'accion_tutela',
          derecho: data.derecho,
          ciudad: data.ciudad,
          vulnerador: data.vulnerador
        }
      });
      
      // Guardar metadatos en Firestore
      const documentData = {
        filename: `accion-tutela-${data.derecho}-${new Date().toISOString().split('T')[0]}.pdf`,
        mime: 'application/pdf',
        size: storageResult.size,
        createdAtISO: new Date().toISOString(),
        tipo: 'accion_tutela',
        derecho: data.derecho,
        ciudad: data.ciudad,
        vulnerador: data.vulnerador,
        storagePath: storageResult.storagePath,
        storageBucket: storageResult.bucket,
        userId: uid,
        docId,
        mock: mock || false
      };
      
      await saveDocument(uid, docId, documentData);
      
      // Agregar al historial de tutelas
      await saveHistoryItem({
        userId: uid,
        fechaISO: new Date().toISOString(),
        titulo: 'accion_tutela',
        derecho: data.derecho,
        ciudad: data.ciudad,
        estado: 'Completado',
        documentId: docId,
        storagePath: storageResult.storagePath
      });

      // Guardar generación para analytics
      await saveDocumentGeneration(docId, {
        userId: uid,
        type: 'accion_tutela',
        areaLegal: 'Derecho Constitucional',
        tipoEscrito: 'Acción de Tutela',
        createdAt: new Date().toISOString(),
        status: 'completed',
        metadata: {
          model: model,
          tokensUsed: 0, // TODO: obtener del response
          processingTime: elapsedMs,
          mock: mock || false,
          ocrFiles: hasOcrData ? body.ocrFiles.length : 0,
          confidence: 0.95
        },
        storage: {
          docId,
          storagePath: storageResult.storagePath,
          size: storageResult.size,
          downloadUrl
        },
        content: {
          inputData: data,
          extractedText: hasOcrData ? body.ocrFiles.map((f: any) => f.extractedText).join('\n') : undefined,
          generatedContent: parsedContent
        },
        pricing: {
          cost: 3.00,
          currency: 'EUR',
          plan: 'premium'
        }
      });

      // Actualizar estadísticas del usuario
      await updateUserStats(uid, {
        totalDocuments: 1, // TODO: incrementar desde stats actuales
        totalGenerations: 1,
        totalSpent: 3.00,
        lastGenerationAt: new Date().toISOString()
      });
      
      // Generar URL de descarga
      const downloadUrl = await signedUrlFor(uid, docId, { expiresMinutes: 15 });
      
      const elapsedMs = Date.now() - startTime;
      
      console.log('✅ Tutela generada exitosamente', {
        docId,
        derecho: data.derecho,
        ciudad: data.ciudad,
        storagePath: storageResult.storagePath,
        mock: mock || false,
        elapsedMs
      });

      // Devolver JSON con información de persistencia
      return NextResponse.json({
        ok: true,
        userId: uid,
        docId,
        firestorePath: `/users/${uid}/documents/${docId}`,
        downloadUrl,
        derecho: data.derecho,
        ciudad: data.ciudad,
        elapsedMs
      });
      
    } catch (storageError) {
      console.error('Error persisting tutela document:', storageError);
      
      // Fallback: devolver PDF directamente
      const filename = `accion-tutela-${data.derecho}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Request-ID': requestId,
          'X-Warning': 'Document not persisted to storage'
        }
      });
    }

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error('❌ Error generando Tutela:', error, { elapsedMs });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Error generando la acción de tutela',
          hint: 'Intenta de nuevo o contacta soporte si el problema persiste'
        }
      },
      { status: 500 }
    );
  }
}
