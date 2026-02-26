import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST /api/stripe/create-checkout-session
 * Crea una sesión de Stripe Checkout unificada para estudiantes, acción de tutela y reclamación de cantidades
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items, // Array de items para estudiantes/tutela
      documentType, // 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades'
      userId,
      customerEmail,
      successUrl,
      cancelUrl,
      // Campos específicos de reclamación
      caseId,
      uid,
      // Campos específicos de tutela
      docId,
      tutelaId,
      formData,
    } = body;

    if (!userId || !customerEmail || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: userId, customerEmail, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    // Para reclamación de cantidades, validar que existe el caso
    if (documentType === 'reclamacion_cantidades') {
      if (!caseId || !uid) {
        return NextResponse.json(
          { error: 'Para reclamación de cantidades se requiere caseId y uid' },
          { status: 400 }
        );
      }

      // Validar que el caso existe y tiene datos necesarios
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
    }

    // Preparar line_items según el tipo
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (items && items.length > 0) {
      // Para estudiantes y tutela: usar items del request
      lineItems = items.map((item: any) => ({
        price_data: {
          currency: item.country === 'Colombia' ? 'cop' : 'eur',
          product_data: {
            name: item.name,
            description: item.area || item.country || '',
          },
          unit_amount: item.price, // Ya viene en centavos o en la unidad mínima (COP)
        },
        quantity: item.quantity || 1,
      }));
    } else if (documentType === 'reclamacion_cantidades') {
      // Para reclamación: usar price ID o amount desde env
      const priceId = process.env.STRIPE_PRICE_ID_RECLAMACION;
      const amount = process.env.RECLAMACION_PRICE_AMOUNT 
        ? parseInt(process.env.RECLAMACION_PRICE_AMOUNT) 
        : 5000; // €50.00 en centavos (default)

      if (priceId) {
        lineItems = [{
          price: priceId,
          quantity: 1,
        }];
      } else {
        lineItems = [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Reclamación de Cantidades',
              description: 'Generación de documento legal de reclamación de cantidades',
            },
            unit_amount: amount,
          },
          quantity: 1,
        }];
      }
    } else {
      return NextResponse.json(
        { error: 'Se requiere items o documentType válido' },
        { status: 400 }
      );
    }

    // Preparar metadata
    const metadata: Record<string, string> = {
      userId,
      documentType: documentType || 'estudiantes',
    };

    // Metadata específica según tipo
    if (documentType === 'reclamacion_cantidades' && caseId && uid) {
      metadata.caseId = caseId;
      metadata.uid = uid;
      metadata.type = 'reclamacion_cantidades';
    } else if (documentType === 'accion_tutela') {
      if (docId) metadata.docId = docId;
      if (tutelaId) metadata.tutelaId = tutelaId;
      if (formData) {
        // Guardar formData en Firestore antes del pago (como backup)
        try {
          const metadataRef = doc(db as any, 'payment_metadata', `${userId}_${Date.now()}`);
          await setDoc(metadataRef as any, {
            userId: userId,
            documentType: 'accion_tutela',
            docId: docId,
            tutelaId: tutelaId,
            formData: formData,
            createdAt: serverTimestamp(),
          } as any, { merge: true });
        } catch (error) {
          console.warn('Error guardando metadata de tutela:', error);
          // No lanzar error aquí para no bloquear el flujo de pago
        }
      }
    } else if (documentType === 'estudiantes') {
      // Para estudiantes, los items ya están en line_items
      metadata.items = JSON.stringify(items);
      metadata.totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0).toString();
    }

    // Validar que lineItems no esté vacío
    if (!lineItems || lineItems.length === 0) {
      console.error('❌ Error: lineItems está vacío', { documentType, items });
      return NextResponse.json(
        { error: 'No se pudieron crear los items de pago. Por favor, verifica los datos.' },
        { status: 400 }
      );
    }

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata,
    });

    // Para reclamación, actualizar el caso en Firestore
    if (documentType === 'reclamacion_cantidades' && caseId && uid) {
      try {
        const caseRef = doc(db as any, 'users', uid, 'reclamaciones_cantidades', caseId);
        await updateDoc(caseRef, {
          'payment.status': 'in_process',
          'payment.stripeCheckoutSessionId': session.id,
          status: 'waiting_payment',
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('Error actualizando caso en Firestore:', error);
      }
    }

    console.log(`✅ Sesión de Stripe creada: ${session.id} para ${documentType}`);

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('❌ Error creando sesión de Stripe:', error);
    console.error('❌ Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    
    // Proporcionar mensaje de error más específico
    let errorMessage = 'Error al crear sesión de pago';
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Error de validación de Stripe: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

