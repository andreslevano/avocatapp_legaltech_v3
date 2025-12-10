import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST /api/reclamaciones-cantidades/create-checkout-session
 * Crea una sesión de Stripe Checkout para el pago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, uid } = body;

    if (!caseId || !uid) {
      return NextResponse.json(
        { error: 'caseId y uid son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el caso pertenece al usuario y tiene datos necesarios
    const caseRef = doc(db as any, 'users', uid, 'reclamaciones_cantidades', caseId);
    const caseDoc = await getDoc(caseRef);

    if (!caseDoc.exists()) {
      return NextResponse.json(
        { error: 'Caso no encontrado o no pertenece al usuario' },
        { status: 404 }
      );
    }

    const caseData = caseDoc.data();

    // Validar que tiene OCR y borrador
    if (!caseData.ocr?.rawText || !caseData.drafting?.lastResponse) {
      return NextResponse.json(
        { error: 'El caso debe tener OCR y borrador generado antes de pagar' },
        { status: 400 }
      );
    }

    // Obtener precio desde variable de entorno o usar default
    const priceId = process.env.STRIPE_PRICE_ID_RECLAMACION || 'price_reclamacion_cantidades';
    const amount = process.env.RECLAMACION_PRICE_AMOUNT 
      ? parseInt(process.env.RECLAMACION_PRICE_AMOUNT) 
      : 5000; // €50.00 en centavos (default)

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/dashboard/reclamacion-cantidades?payment=success&caseId=${caseId}`,
      cancel_url: `${request.nextUrl.origin}/dashboard/reclamacion-cantidades?payment=cancelled&caseId=${caseId}`,
      metadata: {
        caseId,
        uid,
        type: 'reclamacion_cantidades',
      },
    });

    // Actualizar Firestore con información de pago
    await updateDoc(caseRef, {
      'payment.status': 'in_process',
      'payment.stripeCheckoutSessionId': session.id,
      status: 'waiting_payment',
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Sesión de Stripe creada para caso ${caseId}: ${session.id}`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('❌ Error creando sesión de Stripe:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago', details: error.message },
      { status: 500 }
    );
  }
}

