import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { savePurchase, savePdfForUser } from '@/lib/storage';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Desactivar el body parser de Next.js para este endpoint
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Error verificando webhook de Stripe:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('✅ Pago completado:', {
          sessionId: session.id,
          customerId: session.customer,
          amount: session.amount_total,
          metadata: session.metadata,
        });

        // Obtener el userId y caseId del metadata
        const uid = session.metadata?.uid;
        const caseId = session.metadata?.caseId;
        const type = session.metadata?.type;

        // Si es una reclamación de cantidades, generar documento final
        if (type === 'reclamacion_cantidades' && uid && caseId) {
          try {
            console.log(`🚀 Generando documento final para reclamación ${caseId}`);
            
            // Llamar al endpoint de generación final
            const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : 'http://localhost:3000';
            
            const generateResponse = await fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // En producción, usar un secret interno
                'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'internal-secret'}`,
              },
              body: JSON.stringify({ caseId, uid }),
            });

            if (generateResponse.ok) {
              const result = await generateResponse.json();
              console.log('✅ Documento final generado:', result);
            } else {
              const error = await generateResponse.json();
              console.error('❌ Error generando documento final:', error);
            }
          } catch (error) {
            console.error('❌ Error llamando a generate-final:', error);
            // No lanzar error para no romper el webhook
          }
        }

        // Guardar la compra en Firestore (compatibilidad con sistema anterior)
        const userId = uid || session.metadata?.userId;
        if (userId) {
          try {
            await savePurchase(session.id, {
              userId,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || 'eur',
              documentType: type || 'reclamacion_cantidades',
              documentId: caseId,
              metadata: session.metadata || {},
            });
            console.log('✅ Compra guardada en Firestore');
          } catch (error) {
            console.error('❌ Error guardando compra:', error);
            // No lanzar error para no romper el webhook
          }
        }

        // Enviar notificación (opcional)
        if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
          try {
            await fetch(process.env.GOOGLE_CHAT_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `✅ Pago completado\n` +
                      `Session ID: ${session.id}\n` +
                      `Monto: ${(session.amount_total || 0) / 100} ${session.currency?.toUpperCase()}\n` +
                      `Usuario: ${userId || 'N/A'}\n` +
                      `Tipo: ${session.metadata?.documentType || 'N/A'}`,
              }),
            });
          } catch (error) {
            console.warn('No se pudo enviar notificación a Google Chat:', error);
          }
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ Payment Intent exitoso:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('❌ Payment Intent fallido:', paymentIntent.id);
        break;
      }

      default:
        console.log(`⚠️ Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error procesando webhook' },
      { status: 500 }
    );
  }
}

