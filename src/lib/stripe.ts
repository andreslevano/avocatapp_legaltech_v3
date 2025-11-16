import Stripe from 'stripe';
import { db, storage } from './firebase-admin';
import { getOpenAIClient } from './openai-client';
import { renderWordDocument } from './pdf/word-generator';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Planes de suscripción
export const SUBSCRIPTION_PLANS = {
  student: {
    id: 'student',
    name: 'Estudiante',
    price: 0,
    features: ['Generación básica de documentos', 'Plantillas limitadas'],
    limits: {
      documentsPerMonth: 10,
      templates: 5
    }
  },
  pro: {
    id: 'pro',
    name: 'Profesional',
    price: 29.99,
    priceId: 'price_pro_monthly', // ID de precio en Stripe
    features: ['Generación ilimitada', 'Todas las plantillas', 'Soporte prioritario'],
    limits: {
      documentsPerMonth: -1, // Ilimitado
      templates: -1
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    price: 99.99,
    priceId: 'price_enterprise_monthly',
    features: ['Todo lo de Pro', 'API personalizada', 'Soporte dedicado'],
    limits: {
      documentsPerMonth: -1,
      templates: -1
    }
  }
};

export const createCheckoutSession = async (planId: string, userId: string, successUrl?: string, cancelUrl?: string) => {
  const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
  
  if (!plan || !('priceId' in plan) || !plan.priceId) {
    throw new Error('Plan not found or no price ID');
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
      planId,
    },
    customer_email: undefined, // Se puede obtener del usuario autenticado
  });
  
  return session;
};

/**
 * Generates a template document (blank with placeholders)
 */
async function generateTemplate(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear plantillas legales profesionales. 
Genera plantillas vacías con marcadores de posición [PLACEHOLDER] que los estudiantes puedan completar.
Las plantillas deben ser documentos oficiales completos con estructura profesional, capítulos, párrafos y referencias legales.`;

  const userPrompt = `Genera una plantilla completa y profesional para "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.) y párrafos
3. Incluir secciones de:
   - Encabezado con datos del solicitante (con placeholders [NOMBRE], [DNI], [DIRECCIÓN], etc.)
   - Fundamentos jurídicos con referencias a leyes específicas (usar [LEY X/YYYY] como placeholder)
   - Hechos y antecedentes estructurados
   - Justificaciones legales con citas a artículos (usar [ART. X] como placeholder)
   - Peticiones concretas numeradas
   - Referencias normativas completas al final

4. Usar marcadores de posición claros: [NOMBRE], [DNI], [DIRECCIÓN], [FECHA], [CIUDAD], [ART. X], [LEY X/YYYY], etc.
5. Incluir instrucciones breves entre paréntesis cuando sea necesario
6. Mantener formato legal profesional con estructura de documento oficial
7. Incluir referencias a normativas aplicables (Código Civil, Ley de Enjuiciamiento Civil, etc.) con placeholders
8. Estructurar con párrafos numerados y subsecciones cuando corresponda

FORMATO: Documento legal oficial estructurado con capítulos, párrafos y placeholders. Mínimo 4 páginas de contenido completo.`;

  console.log(`📝 Generando plantilla: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 6000
  });

  const { renderStudyMaterialPDF } = await import('./pdf/study-material');
  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Plantilla`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Generates a sample document (filled example)
 */
async function generateSample(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear ejemplos prácticos de documentos legales. 
Genera documentos completos con datos de ejemplo realistas pero ficticios, incluyendo contenido legal completo, justificaciones y referencias normativas.`;

  const userPrompt = `Genera un ejemplo completo y práctico de "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo y detallado
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.) y párrafos estructurados
3. Contenido legal completo que incluya:
   - Encabezado completo con datos ficticios pero realistas (ej: "Juan Pérez García", DNI, dirección)
   - Fundamentos jurídicos DETALLADOS con referencias específicas a leyes reales (ej: Ley 1/2000, Código Civil art. 1902, etc.)
   - Hechos y antecedentes NARRADOS de forma completa y coherente
   - Justificaciones legales EXTENSAS con citas a artículos específicos y jurisprudencia relevante
   - Peticiones concretas y detalladas numeradas
   - Referencias normativas completas al final con leyes, artículos y disposiciones aplicables

4. Usar nombres ficticios realistas: "Juan Pérez García", "María López Martínez", "Empresa ABC S.L.", etc.
5. Incluir datos coherentes y realistas (DNIs, direcciones, fechas, cantidades)
6. Referencias a normativas ESPECÍFICAS y REALES del ordenamiento jurídico español
7. Justificaciones legales COMPLETAS que expliquen por qué cada petición es procedente
8. Estructura profesional con párrafos numerados, subsecciones y formato de documento oficial

FORMATO: Documento legal oficial completo con capítulos, párrafos, referencias legales y justificaciones. Mínimo 4 páginas de contenido completo y profesional.`;

  console.log(`📋 Generando ejemplo: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 6000
  });

  const { renderStudyMaterialPDF } = await import('./pdf/study-material');
  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Ejemplo`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Generates a study material document for a purchased item
 */
async function generateStudyMaterial(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear materiales de estudio para estudiantes de derecho. 
Genera documentos educativos completos, bien estructurados y profesionales que sirvan como guías de estudio exhaustivas.`;

  const userPrompt = `Genera un material de estudio completo y exhaustivo sobre "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo y detallado
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.), párrafos y TABLAS cuando corresponda

ESTRUCTURA OBLIGATORIA:

CAPÍTULO I. INTRODUCCIÓN Y CONTEXTO LEGAL
- Introducción al documento y su importancia en el ordenamiento jurídico
- Contexto histórico y evolución normativa
- Ámbito de aplicación

CAPÍTULO II. MARCO NORMATIVO APLICABLE
- Leyes principales aplicables (con referencias específicas a artículos)
- Reglamentos y disposiciones complementarias
- Jurisprudencia relevante del Tribunal Supremo y tribunales superiores
- Referencias a normativas europeas si aplica

CAPÍTULO III. ESTRUCTURA Y ELEMENTOS DEL DOCUMENTO
- Estructura oficial del documento con explicación de cada sección
- Elementos obligatorios y opcionales
- Formato y presentación requerida

CAPÍTULO IV. PROCEDIMIENTO Y ADMINISTRACIONES COMPETENTES
- TABLA OBLIGATORIA con:
  * Órganos/Administraciones públicas competentes para tramitar el procedimiento
  * Tipo de profesionales que participan (jueces, secretarios, procuradores, abogados, etc.)
  * Plazos y deadlines específicos del procedimiento
  * Tipo de respuesta estándar desde la perspectiva del abogado
  * Instancias y recursos disponibles

CAPÍTULO V. RECURSOS Y REFERENCIAS ADICIONALES
- Referencias a sitios web públicos oficiales relevantes (BOE, páginas de ministerios, tribunales, colegios profesionales)
- Enlaces a bases de datos jurídicas públicas
- Recursos de formación y actualización normativa
- Bibliografía recomendada

CAPÍTULO VI. EJEMPLO PRÁCTICO Y CASOS
- Ejemplo práctico completo con explicación paso a paso
- Casos comunes y cómo resolverlos
- Errores frecuentes a evitar

CAPÍTULO VII. PUNTOS CLAVE Y CHECKLIST
- Puntos clave a recordar
- Checklist para verificar que el documento está completo
- Consejos prácticos para estudiantes

FORMATO: Documento estructurado profesionalmente con capítulos, párrafos numerados, tablas formateadas y referencias. Mínimo 4 páginas de contenido completo. Las tablas deben estar claramente formateadas y ser legibles.`;

  console.log(`📚 Generando material de estudio: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 8000
  });

  // Generate PDF from content
  const { renderStudyMaterialPDF } = await import('./pdf/study-material');
  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Material de Estudio`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Processes a completed checkout session
 */
async function processCheckoutSession(session: Stripe.Checkout.Session) {
  try {
    console.log('📦 Procesando compra completada:', session.id);
    console.log('   Payment Status:', session.payment_status);
    console.log('   Amount:', session.amount_total, session.currency);
    console.log('   Customer Email:', session.customer_email);
    
    // Validate session is actually paid
    if (session.payment_status !== 'paid') {
      console.warn(`⚠️ Session ${session.id} payment status is '${session.payment_status}', not 'paid'. Skipping.`);
      return;
    }
    
    // Check if purchase already exists (prevent duplicates)
    const existingPurchase = await db().collection('purchases')
      .where('stripeSessionId', '==', session.id)
      .limit(1)
      .get();
    
    if (!existingPurchase.empty) {
      const existingId = existingPurchase.docs[0].id;
      console.warn(`⚠️ Purchase already exists for session ${session.id}: ${existingId}. Skipping duplicate creation.`);
      return;
    }
    
    // Extract metadata
    const itemsJson = session.metadata?.items;
    if (!itemsJson) {
      console.error('❌ No items found in session metadata');
      console.error('   Session metadata:', JSON.stringify(session.metadata, null, 2));
      return;
    }

    const items = JSON.parse(itemsJson);
    // Get userId from metadata, or try to find user by email
    let userId = session.metadata?.userId;
    
    if (!userId || userId === 'unknown') {
      // Try to find user by email in Firestore
      const customerEmail = session.customer_email;
      if (customerEmail) {
        try {
          const usersSnapshot = await db().collection('users')
            .where('email', '==', customerEmail)
            .limit(1)
            .get();
          
          if (!usersSnapshot.empty) {
            userId = usersSnapshot.docs[0].id;
            console.log(`✅ Usuario encontrado por email: ${userId}`);
          } else {
            console.warn(`⚠️ Usuario no encontrado para email: ${customerEmail}`);
            userId = 'unknown';
          }
        } catch (error) {
          console.error('Error buscando usuario por email:', error);
          userId = 'unknown';
        }
      }
    }
    
    const customerEmail = session.customer_email || 'unknown@example.com';
    
    // Calculate totals
    const totalAmount = session.amount_total || 0;
    const currency = session.currency?.toUpperCase() || 'EUR';
    
    // Create purchase document
    const purchaseId = uuidv4();
    const purchaseRef = db().collection('purchases').doc(purchaseId);
    
    const purchaseData = {
      id: purchaseId,
      userId,
      customerEmail,
      stripeSessionId: session.id, // REQUIRED: This identifies webhook-created purchases
      stripePaymentIntentId: session.payment_intent as string, // REQUIRED: Payment confirmation
      items: items.map((item: any) => ({
        id: uuidv4(),
        name: item.name,
        area: item.area,
        country: item.country,
        price: item.price / 100, // Convert from cents
        quantity: item.quantity,
        status: 'pending', // Will be updated to 'completed' after document generation
        generatedAt: null,
        storagePath: null,
        downloadUrl: null
      })),
      total: totalAmount / 100,
      currency,
      status: 'completed', // Payment is completed, documents will be generated
      createdAt: new Date(),
      updatedAt: new Date(),
      // Metadata to identify webhook-created purchases
      source: 'stripe_webhook',
      webhookProcessedAt: new Date()
    };

    // Save purchase to Firestore
    await purchaseRef.set(purchaseData);
    console.log('✅ Compra guardada en Firestore:', purchaseId);
    console.log('   Stripe Session ID:', session.id);
    console.log('   Payment Intent ID:', session.payment_intent);

    // Generate documents for each item
    const updatedItems = [];
    for (const item of purchaseData.items) {
      try {
        console.log(`📄 Generando documento: ${item.name} (x${item.quantity})`);
        
        const generatedDocuments = [];
        
        // Generate all 3 document types for each quantity
        for (let i = 0; i < item.quantity; i++) {
          const packageFiles: any = {};
          
          // Helper function to save file and get URL
          const saveFile = async (
            buffer: Buffer, 
            docType: string, 
            extension: 'pdf' | 'docx',
            content: string
          ): Promise<{ docId: string; storagePath: string; downloadUrl: string }> => {
            const docId = uuidv4();
            const storagePath = `users/${userId}/documents/${docId}.${extension}`;
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';
            const bucket = storage().bucket(bucketName);
            const file = bucket.file(storagePath);
          
            const contentType = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            // Create a clean filename for identification
            const cleanName = item.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .substring(0, 50);
            
            await file.save(buffer, {
              contentType,
              metadata: {
                userId,
                documentName: item.name,
                documentType: docType,
                documentFormat: extension,
                area: item.area,
                country: item.country,
                purchaseId,
                purchaseDate: new Date().toISOString(),
                itemId: item.id,
                generatedAt: new Date().toISOString(),
                displayName: `${item.name} - ${docType === 'template' ? 'Plantilla' : docType === 'sample' ? 'Ejemplo' : 'Material de Estudio'}`,
                fileName: `${cleanName}-${docType}.${extension}`
              }
            });

            // Generate signed URL (valid for 7 days - max allowed)
            const [downloadUrl] = await file.getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days (max allowed)
            });

            return { docId, storagePath, downloadUrl };
          };

          // Generate Template (PDF + Word)
          try {
            const { content: templateContent, pdfBuffer: templatePdfBuffer } = await generateTemplate(
              item.name,
              item.area,
              item.country
            );
            
            // Save PDF
            const templatePdfFile = await saveFile(templatePdfBuffer, 'template', 'pdf', templateContent);
            packageFiles.templatePdf = {
              downloadUrl: templatePdfFile.downloadUrl,
              storagePath: templatePdfFile.storagePath
            };
            
            // Generate and save Word
            const templateWordBuffer = await renderWordDocument({
              title: item.name,
              area: item.area,
              country: item.country,
              content: templateContent,
              type: 'template'
            });
            const templateWordFile = await saveFile(templateWordBuffer, 'template', 'docx', templateContent);
            packageFiles.templateDocx = {
              downloadUrl: templateWordFile.downloadUrl,
              storagePath: templateWordFile.storagePath
            };
          } catch (error) {
            console.error(`❌ Error generando plantilla:`, error);
          }

          // Generate Sample (PDF + Word)
          try {
            const { content: sampleContent, pdfBuffer: samplePdfBuffer } = await generateSample(
              item.name,
              item.area,
              item.country
            );
            
            // Save PDF
            const samplePdfFile = await saveFile(samplePdfBuffer, 'sample', 'pdf', sampleContent);
            packageFiles.samplePdf = {
              downloadUrl: samplePdfFile.downloadUrl,
              storagePath: samplePdfFile.storagePath
            };
            
            // Generate and save Word
            const sampleWordBuffer = await renderWordDocument({
              title: item.name,
              area: item.area,
              country: item.country,
              content: sampleContent,
              type: 'sample'
            });
            const sampleWordFile = await saveFile(sampleWordBuffer, 'sample', 'docx', sampleContent);
            packageFiles.sampleDocx = {
              downloadUrl: sampleWordFile.downloadUrl,
              storagePath: sampleWordFile.storagePath
            };
          } catch (error) {
            console.error(`❌ Error generando ejemplo:`, error);
          }

          // Generate Study Material (PDF only)
          try {
            const { content: studyContent, pdfBuffer: studyBuffer } = await generateStudyMaterial(
              item.name,
              item.area,
              item.country
            );
            const studyFile = await saveFile(studyBuffer, 'studyMaterial', 'pdf', studyContent);
            packageFiles.studyMaterialPdf = {
              downloadUrl: studyFile.downloadUrl,
              storagePath: studyFile.storagePath
            };
          } catch (error) {
            console.error(`❌ Error generando material de estudio:`, error);
          }

          // Use study material as the main document (for backward compatibility)
          const mainDoc = packageFiles.studyMaterialPdf || packageFiles.samplePdf || packageFiles.templatePdf;
          
          generatedDocuments.push({
            documentId: mainDoc?.storagePath.split('/').pop()?.replace('.pdf', '') || uuidv4(),
            storagePath: mainDoc?.storagePath || '',
            downloadUrl: mainDoc?.downloadUrl || '',
            generatedAt: new Date(),
            packageFiles // Store packageFiles in the document
          });
        }

        // Get packageFiles from first document
        const firstDocPackageFiles = generatedDocuments.length > 0 && (generatedDocuments[0] as any).packageFiles 
          ? (generatedDocuments[0] as any).packageFiles 
          : {};

        updatedItems.push({
          ...item,
          packageFiles: firstDocPackageFiles,
          documentId: generatedDocuments[0]?.documentId || null,
          storagePath: generatedDocuments[0]?.storagePath || null,
          downloadUrl: generatedDocuments[0]?.downloadUrl || null,
          generatedAt: new Date(),
          status: 'completed',
          documents: generatedDocuments
        });
      } catch (error) {
        console.error(`❌ Error generando documento ${item.name}:`, error);
        updatedItems.push({
          ...item,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate document generation status
    const documentsGenerated = updatedItems.filter((item: any) => item.status === 'completed').length;
    const documentsFailed = updatedItems.filter((item: any) => item.status === 'failed').length;
    const totalItems = updatedItems.length;
    
    // Determine final purchase status:
    // - 'completed' if all documents were generated successfully
    // - 'completed' if at least one document was generated (partial success is still success)
    // - 'failed' only if ALL documents failed
    const finalStatus = documentsGenerated > 0 ? 'completed' : 
                       documentsFailed === totalItems ? 'failed' : 'completed';
    
    // Update purchase with generated documents
    await purchaseRef.update({
      items: updatedItems,
      status: finalStatus, // Ensure status is set to completed after document generation
      updatedAt: new Date(),
      documentsGenerated,
      documentsFailed
    });

    console.log(`✅ Compra procesada completamente: ${purchaseId} (status: ${finalStatus}, documentos: ${documentsGenerated}/${totalItems})`);
    
  } catch (error) {
    console.error('❌ Error procesando checkout session:', error);
    throw error;
  }
}

export const handleWebhook = async (payload: string, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }
  
  // Trim webhook secret to remove any leading/trailing whitespace or newlines
  const trimmedSecret = webhookSecret.trim();
  
  // Ensure payload is a string (not a parsed object)
  if (typeof payload !== 'string') {
    throw new Error('Webhook payload must be a string. Received: ' + typeof payload);
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, trimmedSecret);
    console.log('✅ Webhook signature verified');
    console.log('   Event type:', event.type);
    console.log('   Event ID:', event.id);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Webhook signature verification failed:', errorMessage);
    throw new Error(`Invalid signature: ${errorMessage}`);
  }
  
  // Manejar diferentes tipos de eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Checkout session completed:', session.id);
      console.log('   Payment Status:', session.payment_status);
      console.log('   Mode:', session.mode);
      console.log('   Amount:', session.amount_total, session.currency);
      
      // Only process payment mode sessions (not subscriptions)
      if (session.mode === 'payment') {
        if (session.payment_status === 'paid') {
          await processCheckoutSession(session);
        } else {
          console.warn(`⚠️ Session ${session.id} payment status is '${session.payment_status}', skipping.`);
        }
      } else {
        console.log(`ℹ️ Session ${session.id} is mode '${session.mode}', skipping (only processing 'payment' mode).`);
      }
      break;
      
    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription created:', subscription.id);
      // Handle subscription creation if needed
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log('Subscription updated:', updatedSubscription.id);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', deletedSubscription.id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  return { received: true };
};