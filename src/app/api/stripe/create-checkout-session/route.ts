import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST /api/stripe/create-checkout-session
 * Crea una sesión de Stripe Checkout unificada para diferentes tipos de documentos
 * Soporta: estudiantes, reclamacion_cantidades, accion_tutela
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, documentType, customerEmail, userId, successUrl, cancelUrl, docId, reclId, tutelaId, formData } = body;

    if (!userId || !customerEmail || !documentType || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos para crear la sesión de checkout.' },
        { status: 400 }
      );
    }

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let metadata: { [key: string]: string } = {
      userId,
      customerEmail,
      documentType,
    };

    if (documentType === 'estudiantes' && items && items.length > 0) {
      line_items = items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: item.area,
          },
          unit_amount: item.price, // Already in cents
        },
        quantity: item.quantity,
      }));
    } else if (documentType === 'reclamacion_cantidades') {
      const amount = process.env.RECLAMACION_PRICE_AMOUNT 
        ? parseInt(process.env.RECLAMACION_PRICE_AMOUNT) 
        : 5000; // €50.00 en centavos (default)

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Reclamación de Cantidades',
            description: 'Generación de documento de reclamación de cantidades',
          },
          unit_amount: amount,
        },
        quantity: 1,
      });
      if (docId) metadata.docId = docId;
      if (reclId) metadata.reclId = reclId;
    } else if (documentType === 'accion_tutela') {
      const amount = process.env.ACCION_TUTELA_PRICE_AMOUNT 
        ? parseInt(process.env.ACCION_TUTELA_PRICE_AMOUNT) 
        : 50000; // 50,000 COP (COP no usa centavos)

      line_items.push({
        price_data: {
          currency: 'cop',
          product_data: {
            name: 'Acción de Tutela',
            description: 'Generación de documento de acción de tutela',
          },
          unit_amount: amount,
        },
        quantity: 1,
      });
      if (docId) metadata.docId = docId;
      if (tutelaId) metadata.tutelaId = tutelaId;
      if (formData) metadata.formData = JSON.stringify(formData); // Store form data as string
    } else {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento no soportado o datos de ítems inválidos.' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    });

    // For reclamacion_cantidades and accion_tutela, update Firestore with session ID
    if ((documentType === 'reclamacion_cantidades' && reclId) || (documentType === 'accion_tutela' && tutelaId)) {
      const collectionName = documentType === 'reclamacion_cantidades' ? 'reclamaciones_cantidades' : 'tutelas';
      const docRef = doc(db as any, 'users', userId, collectionName, reclId || tutelaId!);
      await updateDoc(docRef, {
        'payment.status': 'in_process',
        'payment.stripeCheckoutSessionId': session.id,
        status: 'waiting_payment',
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('❌ Error creando sesión de Stripe:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear sesión de pago', details: error.message },
      { status: 500 }
    );
  }
}
