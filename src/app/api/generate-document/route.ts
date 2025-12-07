import { NextRequest, NextResponse } from 'next/server';
import { generateDocument } from '@/lib/openai';
import { GenerateDocumentSchema } from '@/lib/validate';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateAreaSpecificPDF } from '@/lib/pdf-generator';
import { savePdfForUser, signedUrlFor, saveDocument } from '@/lib/simple-storage';
import { GoogleChatNotifications } from '@/lib/google-chat';

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
    
    // Persistir en Firebase Storage y Firestore
    const uid = data.userId || 'demo_user'; // Usar el ID del usuario enviado desde el frontend
    const userEmail = data.userEmail; // Email del usuario para envío automático
    const docId = uuidv4();
    
    try {
      // Guardar PDF en Storage
      const storageResult = await savePdfForUser(uid, docId, pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          userId: uid,
          docId,
          areaLegal: data.areaLegal,
          tipoEscrito: data.tipoEscrito,
          tono: data.tono,
          filename
        }
      });
      
      // Guardar metadatos en Firestore
      const documentData = {
        filename,
        mime: 'application/pdf',
        size: storageResult.size,
        createdAtISO: new Date().toISOString(),
        areaLegal: data.areaLegal,
        tipoEscrito: data.tipoEscrito,
        tono: data.tono,
        storagePath: storageResult.storagePath,
        storageBucket: storageResult.bucket,
        userId: uid,
        docId,
        tokensUsed: result.tokensUsed,
        model: result.model
      };
      
      await saveDocument(uid, docId, documentData);
      
      // Generar URL de descarga
      const downloadUrl = await signedUrlFor(uid, docId, { expiresMinutes: 15 });
      
      // Notificar a Google Chat sobre la generación exitosa (no bloqueante)
      GoogleChatNotifications.documentGenerated({
        userId: uid,
        userEmail: userEmail || 'N/A',
        docId,
        documentType: data.tipoEscrito,
        areaLegal: data.areaLegal,
        filename,
        downloadUrl,
        tokensUsed: result.tokensUsed,
        processingTime: elapsedMs,
      }).catch((err) => {
        console.warn('⚠️ Error enviando notificación a Google Chat:', err);
      });
      
      // Enviar email automático al estudiante si tiene email
      if (userEmail) {
        try {
          const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-student-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: userEmail,
              subject: `📄 Documento Legal Generado - ${data.tipoEscrito}`,
              documentName: data.tipoEscrito,
              areaLegal: data.areaLegal,
              filename: filename,
              downloadUrl: downloadUrl,
              userId: uid,
              docId: docId
            })
          });
          
          if (emailResponse.ok) {
            console.log(`✅ Email enviado exitosamente a ${userEmail}`);
          } else {
            console.error('❌ Error enviando email:', await emailResponse.text());
          }
        } catch (emailError) {
          console.error('❌ Error en envío de email:', emailError);
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          id: requestId,
          docId,
          userId: uid,
          filename,
          mime: 'application/pdf',
          content: result.content,
          pdfBase64: pdfBase64,
          tokensUsed: result.tokensUsed,
          model: result.model,
          elapsedMs,
          storagePath: storageResult.storagePath,
          firestore: {
            path: `/users/${uid}/documents/${docId}`
          },
          downloadUrl
        }
      });
      
    } catch (storageError) {
      console.error('Error persisting document:', storageError);
      
      // Notificar error a Google Chat (no bloqueante)
      GoogleChatNotifications.documentError({
        userId: uid,
        userEmail: userEmail || 'N/A',
        error: storageError instanceof Error ? storageError.message : 'Error desconocido al persistir documento',
        context: 'Error al guardar documento en Storage/Firestore',
        docId,
      }).catch((err) => {
        console.warn('⚠️ Error enviando notificación de error a Google Chat:', err);
      });
      
      // Fallback: devolver sin persistencia
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
          elapsedMs,
          warning: 'Document generated but not persisted to storage'
        }
      });
    }

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, error, { elapsedMs });
    
    // Notificar error crítico a Google Chat (no bloqueante)
    GoogleChatNotifications.documentError({
      error: error instanceof Error ? error.message : 'Error desconocido',
      context: 'Error crítico en la generación del documento',
    }).catch((err) => {
      console.warn('⚠️ Error enviando notificación de error crítico a Google Chat:', err);
    });
    
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
