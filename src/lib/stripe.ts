import Stripe from 'stripe';
import { GoogleChatNotifications } from './google-chat';
import { db } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

export const handleWebhook = async (payload: string, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new Error('Invalid signature');
  }
  
  // Manejar diferentes tipos de eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Checkout session completed:', session.id);
      
      // ============================================
      // VALIDACIÓN DE SEGURIDAD: Verificar payment_status
      // ============================================
      // Solo procesar si el pago fue exitoso
      if (session.payment_status !== 'paid') {
        console.warn(`⚠️ Checkout session ${session.id} no tiene payment_status='paid'. Status actual: ${session.payment_status}. Ignorando actualización de Firestore.`);
        
        // Notificar a Google Chat sobre el estado no pagado (no bloqueante)
        if (session.customer_email) {
          GoogleChatNotifications.purchaseCompleted({
            userId: session.metadata?.userId || 'N/A',
            userEmail: session.customer_email,
            purchaseId: session.id,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'EUR',
            description: `⚠️ Pago NO completado - Status: ${session.payment_status}`,
            type: 'payment',
          }).catch((err) => {
            console.warn('⚠️ Error enviando notificación a Google Chat:', err);
          });
        }
        
        // Retornar sin procesar Firestore
        return { received: true };
      }
      
      // Extraer metadata
      const { userId, docId, reclId, documentType } = session.metadata ?? {};
      
      // ============================================
      // FLUJO ESPECÍFICO PARA RECLAMACIONES
      // ============================================
      if (documentType === 'reclamacion_cantidades') {
        try {
          // Validaciones mínimas
          if (!userId || !docId || !reclId) {
            console.warn('⚠️ Metadata incompleta para reclamación:', {
              sessionId: session.id,
              userId,
              docId,
              reclId
            });
            // Continuar con notificación a Google Chat pero no actualizar Firestore
          } else {
            const amount = (session.amount_total || 0) / 100; // Convertir de céntimos a euros
            const currency = session.currency?.toUpperCase() || 'EUR';
            const purchaseId = session.id; // Usar session.id como purchaseId

            // 1. Verificar que la reclamación existe
            const reclRef = db().collection('reclamaciones').doc(reclId);
            const reclDoc = await reclRef.get();

            if (!reclDoc.exists) {
              console.warn(`⚠️ Reclamación ${reclId} no existe en Firestore`);
              // Continuar con notificación pero no actualizar
            } else {
              // 2. Guardar compra en /purchases/{purchaseId} con estructura correcta
              const purchaseData = {
                id: purchaseId,
                userId,
                customerEmail: session.customer_email || '',
                documentType: 'reclamacion_cantidades' as const,
                items: [{
                  id: docId || purchaseId,
                  documentId: docId,
                  documentType: 'reclamacion_cantidades',
                  name: 'Reclamación de Cantidades',
                  area: 'Derecho Laboral',
                  country: 'ES',
                  price: amount,
                  quantity: 1,
                  status: 'completed' as const,
                  generatedAt: new Date().toISOString()
                }],
                total: amount,
                currency: currency?.toUpperCase() || 'EUR',
                status: 'completed' as const,
                source: 'stripe_webhook' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string,
                paymentMethod: 'stripe',
                documentsGenerated: 1,
                docId: docId,
                // Metadata adicional para compatibilidad
                metadata: {
                  stripePaymentIntentId: session.payment_intent as string,
                  stripeSessionId: session.id,
                  customerEmail: session.customer_email || undefined,
                  documentId: docId,
                  reclId: reclId,
                  documentType: 'reclamacion_cantidades'
                }
              };

              await db().collection('purchases').doc(purchaseId).set(purchaseData);
              console.log(`💾 Compra guardada en /purchases/${purchaseId} con estructura correcta`);

              // 3. Actualizar /reclamaciones/{reclId}
              await reclRef.update({
                precio: amount,
                estado: 'completada',
                updatedAt: new Date().toISOString()
              });
              console.log(`✅ Reclamación ${reclId} actualizada: precio=${amount}, estado=completada`);

              // 4. Actualizar o crear /documents/{docId}
              const docRef = db().collection('documents').doc(docId);
              const docDoc = await docRef.get();

              if (docDoc.exists) {
                // Actualizar documento existente
                await docRef.update({
                  'pricing.cost': amount,
                  'pricing.currency': currency,
                  'pricing.paid': true,
                  'pricing.paidAt': new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                console.log(`✅ Documento ${docId} actualizado: pricing.cost=${amount}`);
              } else {
                // Crear documento si no existe (el documento se generará después del pago)
                console.log(`⚠️ Documento ${docId} no existe aún, creando entrada básica...`);
                await docRef.set({
                  id: docId,
                  userId: userId,
                  type: 'reclamacion_cantidades',
                  areaLegal: 'Derecho Laboral',
                  tipoEscrito: 'Reclamación de Cantidades',
                  createdAt: new Date().toISOString(),
                  createdAtISO: new Date().toISOString(),
                  status: 'pending', // Pendiente de generación
                  metadata: {
                    model: 'gpt-4o',
                    tokensUsed: 0,
                    processingTime: 0,
                    mock: false
                  },
                  storage: {
                    docId: docId,
                    storagePath: '',
                    size: 0
                  },
                  content: {
                    inputData: {},
                    generatedContent: {}
                  },
                  pricing: {
                    cost: amount,
                    currency: currency,
                    plan: 'reclamacion_cantidades',
                    paid: true,
                    paidAt: new Date().toISOString()
                  },
                  filename: `reclamacion-cantidades-${new Date().toISOString().split('T')[0]}.pdf`,
                  mime: 'application/pdf'
                });
                console.log(`✅ Documento ${docId} creado con estado 'pending' (se generará después del pago)`);
              }

              // 5. Actualizar estadísticas del usuario /users/{userId}
              const userRef = db().collection('users').doc(userId);
              const userDoc = await userRef.get();

              if (userDoc.exists) {
                await userRef.update({
                  'stats.totalSpent': FieldValue.increment(amount),
                  'stats.totalReclamaciones': FieldValue.increment(1),
                  updatedAt: new Date().toISOString()
                });
                console.log(`✅ Estadísticas del usuario ${userId} actualizadas: totalSpent+=${amount}, totalReclamaciones+=1`);
              } else {
                console.warn(`⚠️ Usuario ${userId} no existe en Firestore`);
              }
            }
          }

          // 6. Notificar a Google Chat con datos de reclamación
          if (session.customer_email && session.amount_total) {
            GoogleChatNotifications.purchaseCompleted({
              userId: userId || 'N/A',
              userEmail: session.customer_email,
              purchaseId: session.id,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency?.toUpperCase() || 'EUR',
              description: `Reclamación de Cantidades - docId: ${docId}, reclId: ${reclId}`,
              type: 'payment',
            }).catch((err) => {
              console.warn('⚠️ Error enviando notificación de compra a Google Chat:', err);
            });
          }

        } catch (error: any) {
          // Loggear error pero NO romper el webhook (Stripe recomienda 200 salvo casos críticos)
          console.error('❌ Error procesando webhook de reclamación:', error);
          console.error('Stack:', error.stack);
          
          // Notificar error a Google Chat (no bloqueante)
          GoogleChatNotifications.purchaseCompleted({
            userId: userId || 'N/A',
            userEmail: session.customer_email || 'N/A',
            purchaseId: session.id,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'EUR',
            description: `ERROR procesando reclamación: ${error.message}`,
            type: 'payment',
          }).catch(() => {
            // Ignorar errores de notificación
          });
        }
      } else {
        // ============================================
        // FLUJO ORIGINAL PARA ESTUDIANTES (sin cambios)
        // ============================================
        // Notificar a Google Chat sobre la compra completada (no bloqueante)
        if (session.customer_email && session.amount_total) {
          GoogleChatNotifications.purchaseCompleted({
            userId: session.metadata?.userId || 'N/A',
            userEmail: session.customer_email,
            purchaseId: session.id,
            amount: (session.amount_total || 0) / 100, // Convertir de centavos a euros
            currency: session.currency?.toUpperCase() || 'EUR',
            description: session.metadata?.items || 'Compra de documentos',
            type: session.mode === 'subscription' ? 'subscription' : 'payment',
          }).catch((err) => {
            console.warn('⚠️ Error enviando notificación de compra a Google Chat:', err);
          });
        }
        
        // Aquí actualizarías la base de datos para marcar al usuario como pro (comportamiento original)
      }
      break;
      
    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription created:', subscription.id);
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