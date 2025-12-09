import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserId } from '@/lib/auth-helper';

// Validar que STRIPE_SECRET_KEY esté configurado
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
console.log('🔍 Verificando STRIPE_SECRET_KEY:', {
  exists: !!STRIPE_SECRET_KEY,
  length: STRIPE_SECRET_KEY?.length || 0,
  prefix: STRIPE_SECRET_KEY?.substring(0, 15) || 'N/A',
  isPlaceholder: STRIPE_SECRET_KEY === 'your_stripe_secret_key_here'
});

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
  console.error('❌ STRIPE_SECRET_KEY no está configurado correctamente');
}

let stripe: Stripe | null = null;
try {
  if (STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'your_stripe_secret_key_here') {
    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe inicializado correctamente');
  } else {
    console.warn('⚠️ Stripe no inicializado - clave no válida');
  }
} catch (error: any) {
  console.error('❌ Error inicializando Stripe:', error.message);
  stripe = null;
}

// Precio fijo para reclamaciones de cantidades (en céntimos de euro)
const RECLAMACION_UNIT_AMOUNT = parseInt(
  process.env.STRIPE_RECLAMACION_UNIT_AMOUNT || '999', // 9.99 EUR por defecto
  10
);

export async function POST(request: NextRequest) {
  try {
    // Validar que Stripe esté configurado
    if (!stripe) {
      const keyStatus = STRIPE_SECRET_KEY 
        ? (STRIPE_SECRET_KEY.length > 0 ? 'presente pero inválido' : 'vacía')
        : 'no configurada';
      console.error('❌ Stripe no está configurado. Estado de STRIPE_SECRET_KEY:', keyStatus);
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe no está configurado',
          details: `STRIPE_SECRET_KEY ${keyStatus}. Por favor, configura tu clave de Stripe en .env.local y reinicia el servidor.`,
          hint: 'La clave debe empezar con sk_test_ o sk_live_'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Stripe configurado correctamente');
    const body = await request.json();
    console.log('📝 Body recibido:', { documentType: body.documentType, docId: body.docId, reclId: body.reclId });
    const { 
      documentType, 
      docId, 
      reclId, 
      userId: bodyUserId, 
      customerEmail, 
      successUrl, 
      cancelUrl,
      // Campos para el flujo de estudiantes (mantener compatibilidad)
      items 
    } = body;

    // ============================================
    // FLUJO ESPECÍFICO PARA RECLAMACIONES
    // ============================================
    if (documentType === 'reclamacion_cantidades') {
      // Validar campos requeridos para reclamaciones
      if (!docId || !reclId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'docId y reclId son requeridos para reclamaciones de cantidades' 
          },
          { status: 400 }
        );
      }

      // Obtener userId: primero del auth, luego del body (solo en desarrollo)
      console.log('🔐 Obteniendo userId...', { bodyUserId, hasAuthHeader: !!request.headers.get('authorization') });
      const userId = await getUserId(request, bodyUserId);
      console.log('✅ userId obtenido:', userId || 'null');

      if (!userId) {
        console.warn('⚠️ userId no encontrado');
        return NextResponse.json(
          { 
            success: false, 
            error: 'userId es requerido. Debe estar autenticado o proporcionar userId en el body (solo en desarrollo)',
            hint: 'En desarrollo, puedes pasar userId en el body del request'
          },
          { status: 401 }
        );
      }

      // Crear sesión de checkout con precio fijo para reclamaciones
      console.log('💳 Creando sesión de checkout de Stripe...', {
        amount: RECLAMACION_UNIT_AMOUNT / 100,
        userId,
        docId,
        reclId
      });
      
      let session;
      try {
        // Añadir timeout para evitar que se quede colgado
        const createSessionPromise = stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: 'Reclamación de Cantidades',
                  description: 'Generación de documento legal de reclamación de cantidades laborales',
                },
                unit_amount: RECLAMACION_UNIT_AMOUNT, // Precio fijo en céntimos
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          customer_email: customerEmail,
          success_url: successUrl || `${request.nextUrl.origin}/dashboard/reclamacion-cantidades?payment=success&docId=${docId}&reclId=${reclId}`,
          cancel_url: cancelUrl || `${request.nextUrl.origin}/dashboard/reclamacion-cantidades?payment=cancelled`,
          metadata: {
            userId,
            docId,
            reclId,
            documentType: 'reclamacion_cantidades',
          },
        });

        // Timeout de 30 segundos
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout: La creación de sesión de Stripe tardó más de 30 segundos')), 30000);
        });

        session = await Promise.race([createSessionPromise, timeoutPromise]) as any;
        console.log('✅ Sesión de Stripe creada exitosamente:', session.id);
      } catch (stripeError: any) {
        console.error('❌ Error creando sesión de Stripe:', stripeError);
        const errorMessage = stripeError.message || stripeError.type || 'Unknown error';
        const errorDetails = stripeError.raw?.message || stripeError.code || '';
        
        return NextResponse.json(
          {
            success: false,
            error: 'Error creando sesión de checkout',
            details: `Stripe error: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`,
            hint: 'Verifica tu conexión a internet y que STRIPE_SECRET_KEY sea válida'
          },
          { status: 500 }
        );
      }

      console.log(`✅ Checkout session creada para reclamación:`, {
        sessionId: session.id,
        userId,
        docId,
        reclId,
        amount: RECLAMACION_UNIT_AMOUNT / 100
      });

      return NextResponse.json({
        success: true,
        url: session.url,
        sessionId: session.id,
        amount: RECLAMACION_UNIT_AMOUNT / 100, // Devolver en euros
        currency: 'EUR'
      });
    }

    // ============================================
    // FLUJO ORIGINAL PARA ESTUDIANTES (sin cambios)
    // ============================================
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      );
    }

    // Create line items for Stripe checkout (comportamiento original)
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          description: `Área: ${item.area}`,
        },
        unit_amount: item.price, // Already in cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        items: JSON.stringify(items),
        totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        // Incluir userId si está disponible
        ...(bodyUserId && { userId: bodyUserId }),
      },
    });

    console.log(`✅ Checkout session creada para estudiantes:`, {
      sessionId: session.id,
      itemsCount: items.length
    });
    
    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    
    // Mensajes de error más específicos
    let errorMessage = 'Error creating checkout session';
    let errorDetails = error.message;
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Error de configuración de Stripe';
      errorDetails = error.message || 'Verifica que STRIPE_SECRET_KEY sea válido';
    } else if (error.message?.includes('No such')) {
      errorMessage = 'Recurso de Stripe no encontrado';
      errorDetails = error.message;
    } else if (error.message?.includes('Invalid API Key')) {
      errorMessage = 'Clave API de Stripe inválida';
      errorDetails = 'Verifica que STRIPE_SECRET_KEY sea correcta en .env.local';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        // Solo incluir stack en desarrollo
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}
