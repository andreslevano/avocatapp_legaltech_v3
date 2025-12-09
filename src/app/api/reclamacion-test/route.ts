import { NextRequest, NextResponse } from 'next/server';
import { ReclamacionCantidadesRequestSchema, ReclamacionCantidadesModelSchema } from '@/lib/validate-reclamacion-cantidades';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/reclamacion_cantidades_co';
import { renderReclamacionCantidadesPDF } from '@/lib/pdf/reclamacion-cantidades';
import { checkRateLimit } from '@/lib/ratelimit';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIClient } from '@/lib/openai-client';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

// Endpoint temporal de compatibilidad - Usa la misma lógica que /api/reclamacion-cantidades
// TODO: Eliminar este endpoint una vez que el frontend esté actualizado en producción
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log('⚠️ /api/reclamacion-test llamado (endpoint de compatibilidad) - Usando lógica de /api/reclamacion-cantidades');
    
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
    const uid = data.userId || 'demo_user';
    
    // Obtener datos del usuario desde Firestore si userId está presente
    let userProfile: any = null;
    if (uid && uid !== 'demo_user') {
      try {
        const userDoc = await db().collection('users').doc(uid).get();
        if (userDoc.exists) {
          userProfile = { uid: userDoc.id, ...userDoc.data() };
          console.log(`✅ Datos del usuario obtenidos desde Firestore:`, {
            uid,
            displayName: userProfile.displayName,
            email: userProfile.email,
            hasProfile: !!userProfile.profile
          });
        } else {
          console.log(`⚠️ Usuario ${uid} no encontrado en Firestore`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Error obteniendo datos del usuario desde Firestore:`, error.message);
      }
    }
    
    // Log request
    console.log(`📝 Generando Reclamación de Cantidades para ${data.nombreTrabajador}`, {
      trabajador: data.nombreTrabajador,
      empresa: data.nombreEmpresa,
      localidad: data.localidad,
      userId: uid,
      hasUserProfile: !!userProfile
    });

    // Generar reclamación con ChatGPT (incluyendo datos del perfil si están disponibles)
    const userPrompt = buildUserPrompt(data, userProfile);
    
    console.log('🤖 Enviando prompt a ChatGPT...');
    const openaiClient = getOpenAIClient();
    const result = await openaiClient.generateContent(userPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 3000
    });

    const content = result.content;

    if (!content) {
      throw new Error('No se recibió contenido del modelo');
    }

    // Parsear y validar JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
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
    const docId = requestId;
    const filename = `reclamacion-cantidades-${data.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Guardar documento en Firestore incluso si no está pagado
    try {
      const { savePdfForUser, signedUrlFor, saveDocumentGeneration } = await import('@/lib/simple-storage');
      
      console.log(`💾 Guardando documento en Firestore: ${docId} para usuario ${uid}`);
      
      const storageResult = await savePdfForUser(uid, docId, pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          userId: uid,
          docId,
          tipoEscrito: 'Reclamación de Cantidades',
          filename
        }
      });

      console.log(`✅ PDF guardado en Storage: ${storageResult.storagePath}`);

      const documentData = {
        userId: uid,
        type: 'reclamacion_cantidades',
        areaLegal: 'Derecho Laboral',
        tipoEscrito: 'Reclamación de Cantidades',
        createdAt: new Date().toISOString(),
        createdAtISO: new Date().toISOString(),
        status: 'completed',
        metadata: {
          model: result.model || 'gpt-4o',
          tokensUsed: result.usage?.totalTokens || 0,
          processingTime: elapsedMs,
          mock: false
        },
        storage: {
          docId,
          storagePath: storageResult.storagePath,
          size: storageResult.size,
          downloadUrl: await signedUrlFor(uid, docId, { expiresMinutes: 15 })
        },
        content: {
          inputData: data,
          generatedContent: parsedContent
        },
        pricing: {
          cost: parseFloat(process.env.STRIPE_RECLAMACION_UNIT_AMOUNT || '1999') / 100,
          currency: 'EUR',
          plan: 'reclamacion_cantidades',
          paid: false,
          paidAt: null
        },
        filename,
        mime: 'application/pdf'
      };

      await saveDocumentGeneration(docId, documentData);

      console.log(`✅ Documento guardado en Firestore: ${docId} (no pagado aún)`);
    } catch (saveError: any) {
      console.error(`❌ Error guardando documento en Firestore:`, saveError);
    }
    
    console.log(`✅ Reclamación de Cantidades generada exitosamente`, {
      docId,
      trabajador: data.nombreTrabajador,
      empresa: data.nombreEmpresa,
      elapsedMs
    });

    // Devolver PDF directamente
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Request-ID': docId
      }
    });

  } catch (error: any) {
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


