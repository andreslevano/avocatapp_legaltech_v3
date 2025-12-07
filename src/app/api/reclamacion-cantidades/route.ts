import { NextRequest, NextResponse } from 'next/server';
import { ReclamacionCantidadesRequestSchema, ReclamacionCantidadesModelSchema } from '@/lib/validate-reclamacion-cantidades';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/reclamacion_cantidades_co';
import { renderReclamacionCantidadesPDF } from '@/lib/pdf/reclamacion-cantidades';
import { checkRateLimit } from '@/lib/ratelimit';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIClient } from '@/lib/openai-client';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

/**
 * Normaliza el JSON de reclamación para que coincida con el esquema esperado
 * Convierte campos como "encabezado.tribunal" a "encabezado.juzgado" y "encabezado.localidad"
 */
function normalizeReclamacionJSON(data: any): any {
  const normalized: any = { ...data };
  
  // Normalizar encabezado
  if (normalized.encabezado) {
    if (normalized.encabezado.tribunal && !normalized.encabezado.juzgado) {
      normalized.encabezado.juzgado = normalized.encabezado.tribunal;
      delete normalized.encabezado.tribunal;
    }
    // Asegurar que localidad existe
    if (!normalized.encabezado.localidad && normalized.encabezado.juzgado) {
      // Intentar extraer localidad del juzgado
      const match = normalized.encabezado.juzgado.match(/\[LOCALIDAD\]|DE\s+([A-ZÁÉÍÓÚÑ\s]+)/);
      normalized.encabezado.localidad = match ? match[1]?.trim() || 'Madrid' : 'Madrid';
    }
  }
  
  // Remover campos no esperados
  delete normalized.notaAclaratoria;
  
  // Asegurar que todos los campos requeridos existen
  if (!normalized.hechos?.primer) normalized.hechos = { ...normalized.hechos, primer: {} };
  if (!normalized.hechos?.segundo) normalized.hechos = { ...normalized.hechos, segundo: { cantidadesAdeudadas: [], interesDemora: false } };
  if (!normalized.hechos?.tercer) normalized.hechos = { ...normalized.hechos, tercer: { cargoSindical: false } };
  if (!normalized.hechos?.cuarto) normalized.hechos = { ...normalized.hechos, cuarto: { fechaPapeleta: '', fechaConciliacion: '', resultado: '' } };
  
  if (!normalized.fundamentos) normalized.fundamentos = { primero: '', segundo: '', tercero: '', cuarto: '' };
  if (!normalized.petitorio) normalized.petitorio = { cantidadReclamada: '', intereses: false, lugar: '', fecha: '' };
  if (!normalized.otrosi) normalized.otrosi = { asistenciaLetrada: false, mediosPrueba: { documental: [], interrogatorio: '' } };
  
  return normalized;
}

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
    const uid = data.userId || 'demo_user';
    
    console.log(`📝 Generando documento para userId: ${uid}`, {
      userIdFromBody: data.userId,
      finalUserId: uid,
      docId: (data as any).docId,
      reclId: (data as any).reclId
    });
    
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
        // Continuar sin datos del usuario si hay error
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

    // Preparar contexto OCR si está disponible
    const hasOcrData = body.ocrFiles && body.ocrFiles.length > 0;
    const ocrContext = hasOcrData ? `
    
DATOS EXTRAÍDOS DE DOCUMENTOS (OCR):
${body.ocrFiles.map((file: any, index: number) => `
Documento ${index + 1}: ${file.originalName || `Documento ${index + 1}`}
Categoría: ${file.category || 'No especificada'}
Texto extraído: ${file.extractedText || 'No disponible'}
Confianza: ${file.confidence ? (file.confidence * 100).toFixed(1) + '%' : 'N/A'}
`).join('\n')}

INSTRUCCIONES ESPECIALES PARA USAR DATOS OCR:
- Extrae información relevante de los textos OCR para completar los datos del trabajador, empresa y cantidades adeudadas
- Si encuentras cantidades en los documentos OCR, úsalas para completar el campo "cantidadesAdeudadas"
- Si encuentras fechas relevantes (contratos, nóminas, etc.), úsalas para completar los hechos
- Si encuentras información sobre salarios, convenios o condiciones laborales, úsala para completar los datos laborales
` : '';

    // Generar reclamación con ChatGPT (incluyendo datos del perfil y OCR si están disponibles)
    const userPrompt = buildUserPrompt(data, userProfile) + ocrContext;
    
    console.log('🤖 Enviando prompt a ChatGPT...', {
      hasOcrData,
      ocrFilesCount: hasOcrData ? body.ocrFiles.length : 0,
      hasUserProfile: !!userProfile
    });
    
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

    // Parsear y validar JSON - manejar markdown code blocks
    let parsedContent;
    try {
      // Primero intentar parsear directamente
      parsedContent = JSON.parse(content);
    } catch (parseError: any) {
      // Si falla, intentar extraer JSON del markdown
      let jsonContent = content;
      
      // Remover markdown code blocks si existen
      // Patrón más robusto que maneja diferentes formatos de markdown
      if (content.includes('```json')) {
        // Buscar ```json ... ```
        const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1].trim();
          console.log('✅ JSON extraído de markdown code block (```json)');
        } else {
          // Intentar sin el salto de línea
          const jsonMatch2 = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch2 && jsonMatch2[1]) {
            jsonContent = jsonMatch2[1].trim();
            console.log('✅ JSON extraído de markdown code block (```json, sin salto de línea)');
          }
        }
      } else if (content.includes('```')) {
        // Intentar con cualquier code block (puede ser ``` sin especificar tipo)
        const jsonMatch = content.match(/```[a-z]*\s*\n?([\s\S]*?)\n?\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1].trim();
          console.log('✅ JSON extraído de markdown code block (```)');
        } else {
          // Intentar sin salto de línea
          const jsonMatch2 = content.match(/```[a-z]*\s*([\s\S]*?)\s*```/);
          if (jsonMatch2 && jsonMatch2[1]) {
            jsonContent = jsonMatch2[1].trim();
            console.log('✅ JSON extraído de markdown code block (```, sin salto de línea)');
          }
        }
      }
      
      // Si aún no tenemos JSON válido, buscar entre llaves
      if (jsonContent === content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
          console.log('✅ JSON extraído usando regex de llaves');
        }
      }
      
      try {
        parsedContent = JSON.parse(jsonContent);
        console.log('✅ JSON parseado correctamente después de extracción');
      } catch (secondError: any) {
        console.error('❌ Error parseando JSON extraído:', secondError.message);
        console.error('📄 Contenido recibido (primeros 500 chars):', content.substring(0, 500));
        throw new Error(`No se pudo extraer JSON válido de la respuesta: ${secondError.message}. Contenido: ${content.substring(0, 200)}...`);
      }
    }

    // Intentar normalizar el JSON antes de validar
    const normalizedContent = normalizeReclamacionJSON(parsedContent);
    
    // Validar con Zod
    const modelValidation = ReclamacionCantidadesModelSchema.safeParse(normalizedContent);
    
    if (!modelValidation.success) {
      // Log detallado de errores de validación
      console.error('❌ Error de validación en primera respuesta:', {
        errors: modelValidation.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        receivedKeys: Object.keys(parsedContent || {}),
        sampleContent: JSON.stringify(parsedContent).substring(0, 500)
      });
      
      // Reintentar una vez con prompt más específico que incluya el esquema exacto
      const retryPrompt = userPrompt + `\n\nIMPORTANTE: El JSON debe tener EXACTAMENTE esta estructura (sin campos adicionales como "notaAclaratoria"):
{
  "encabezado": {
    "juzgado": "AL TRIBUNAL DE INSTANCIA, SECCIÓN SOCIAL DE [LOCALIDAD]",
    "localidad": "string"
  },
  "demandante": {
    "nombre": "string",
    "dni": "string",
    "domicilio": "string",
    "telefono": "string"
  },
  "demandada": {
    "nombre": "string",
    "cif": "string",
    "domicilio": "string"
  },
  "hechos": {
    "primer": {
      "tipoContrato": "string",
      "jornada": "string",
      "coeficienteParcialidad": "string",
      "tareas": "string",
      "antiguedad": "string",
      "duracion": "string",
      "salario": "string",
      "convenio": "string"
    },
    "segundo": {
      "cantidadesAdeudadas": ["string"],
      "interesDemora": true
    },
    "tercer": {
      "cargoSindical": false
    },
    "cuarto": {
      "fechaPapeleta": "string",
      "fechaConciliacion": "string",
      "resultado": "string"
    }
  },
  "fundamentos": {
    "primero": "string",
    "segundo": "string",
    "tercero": "string",
    "cuarto": "string"
  },
  "petitorio": {
    "cantidadReclamada": "string",
    "intereses": true,
    "lugar": "string",
    "fecha": "string"
  },
  "otrosi": {
    "asistenciaLetrada": true,
    "mediosPrueba": {
      "documental": ["string"],
      "interrogatorio": "string"
    }
  }
}

NO incluyas "notaAclaratoria" ni otros campos adicionales. Devuelve EXCLUSIVAMENTE el JSON válido sin formato Markdown.`;
      
      const retryResult = await openaiClient.generateContent(retryPrompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3000
      });

      if (!retryResult.content) {
        throw new Error('No se recibió contenido en el reintento');
      }

      // Parsear JSON del reintento - manejar markdown code blocks
      let retryParsed;
      try {
        retryParsed = JSON.parse(retryResult.content);
      } catch (retryParseError: any) {
        // Extraer JSON del markdown si es necesario
        let retryJsonContent = retryResult.content;
        
        if (retryResult.content.includes('```json')) {
          const jsonMatch = retryResult.content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            retryJsonContent = jsonMatch[1].trim();
          }
        } else if (retryResult.content.includes('```')) {
          const jsonMatch = retryResult.content.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            retryJsonContent = jsonMatch[1].trim();
          }
        } else {
          const jsonMatch = retryResult.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            retryJsonContent = jsonMatch[0];
          }
        }
        
        try {
          retryParsed = JSON.parse(retryJsonContent);
        } catch (secondRetryError: any) {
          throw new Error(`No se pudo extraer JSON válido del reintento: ${secondRetryError.message}`);
        }
      }
      
      const retryValidation = ReclamacionCantidadesModelSchema.safeParse(retryParsed);
      
      if (!retryValidation.success) {
        // Log detallado de errores en el reintento
        console.error('❌ Error de validación en reintento:', {
          errors: retryValidation.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
            received: e.path.length > 0 ? (retryParsed as any)?.[e.path[0]] : undefined
          })),
          receivedKeys: Object.keys(retryParsed || {}),
          sampleContent: JSON.stringify(retryParsed).substring(0, 500)
        });
        
        // Intentar normalizar el JSON antes de fallar
        const normalized = normalizeReclamacionJSON(retryParsed);
        const normalizedValidation = ReclamacionCantidadesModelSchema.safeParse(normalized);
        
        if (normalizedValidation.success) {
          console.log('✅ JSON normalizado exitosamente');
          parsedContent = normalizedValidation.data;
        } else {
          throw new Error(`Validación fallida en reintento: ${retryValidation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
      } else {
        parsedContent = retryValidation.data;
      }
      
      parsedContent = retryValidation.data;
    } else {
      parsedContent = modelValidation.data;
    }

    // Generar PDF
    const pdfBuffer = await renderReclamacionCantidadesPDF(parsedContent);
    
    const elapsedMs = Date.now() - startTime;
    // Usar docId del body si está disponible (viene del pago de Stripe), sino usar requestId
    const docId = (data as any).docId || requestId;
    const filename = `reclamacion-cantidades-${data.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    console.log(`📄 Usando docId: ${docId}`, {
      fromBody: !!(data as any).docId,
      fromRequestId: !(data as any).docId
    });
    
    // Guardar documento en Firestore incluso si no está pagado
    try {
      const { savePdfForUser, signedUrlFor, saveDocumentGeneration } = await import('@/lib/simple-storage');
      
      console.log(`💾 Guardando documento en Firestore: ${docId} para usuario ${uid}`);
      
      // Guardar PDF en Storage
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

      // Guardar documento en Firestore con estado "generated" (no pagado aún)
      const documentData = {
        userId: uid,
        type: 'reclamacion_cantidades',
        areaLegal: 'Derecho Laboral',
        tipoEscrito: 'Reclamación de Cantidades',
        createdAt: new Date().toISOString(),
        createdAtISO: new Date().toISOString(), // Duplicado para compatibilidad
        status: 'completed',
        metadata: {
          model: result.model || 'gpt-4o',
          tokensUsed: result.usage?.totalTokens || 0,
          processingTime: elapsedMs,
          mock: false,
          ocrFiles: data.ocrFiles?.length || data.documentSummary?.totalDocuments || 0, // Número real de documentos subidos
          documentCount: data.ocrFiles?.length || data.documentSummary?.totalDocuments || 0, // Duplicado para compatibilidad
          confidence: data.documentSummary?.precision ? data.documentSummary.precision / 100 : 0.85 // Precisión del análisis
        },
        storage: {
          docId,
          storagePath: storageResult.storagePath,
          size: storageResult.size,
          downloadUrl: await signedUrlFor(uid, docId, { expiresMinutes: 15 })
        },
        content: {
          inputData: data,
          generatedContent: parsedContent,
          // Incluir información de archivos subidos si está disponible
          uploadedFiles: data.ocrFiles?.map((file: any) => ({
            originalName: file.originalName,
            storagePath: file.storagePath,
            downloadUrl: file.downloadUrl,
            category: file.category,
            extractedText: file.extractedText
          })) || []
        },
        pricing: {
          cost: parseFloat(process.env.STRIPE_RECLAMACION_UNIT_AMOUNT || '1999') / 100,
          currency: 'EUR',
          plan: 'reclamacion_cantidades',
          paid: false, // No pagado aún
          paidAt: null
        },
        filename,
        mime: 'application/pdf'
      };

      await saveDocumentGeneration(docId, documentData);

      console.log(`✅ Documento guardado en Firestore: ${docId}`, {
        userId: uid,
        docId: docId,
        type: 'reclamacion_cantidades',
        paid: false,
        status: 'completed',
        hasStorage: !!storageResult.storagePath,
        storagePath: storageResult.storagePath
      });
    } catch (saveError: any) {
      console.error(`❌ Error guardando documento en Firestore:`, saveError);
      console.error('Stack:', saveError.stack);
      // Continuar aunque falle el guardado para no bloquear la generación del PDF
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
    console.error('Stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error?.message || 'Error generando la reclamación de cantidades',
          hint: error?.message || 'Intenta de nuevo o contacta soporte si el problema persiste',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      },
      { status: 500 }
    );
  }
}