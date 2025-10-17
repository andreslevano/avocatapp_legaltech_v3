import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { StripeCheckoutSchema } from '@/lib/validate';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const body = await request.json();
    const validationResult = StripeCheckoutSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de checkout inválidos',
            hint: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          }
        },
        { status: 400 }
      );
    }
    
    const { planId, successUrl, cancelUrl } = validationResult.data;
    
    // En producción, obtener userId del token de autenticación
    const userId = 'user_' + Date.now(); // Mock para desarrollo
    
    const session = await createCheckoutSession(planId, userId, successUrl, cancelUrl);
    
    apiLogger.success(requestId, { 
      sessionId: session.id, 
      planId,
      userId 
    });
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHECKOUT_SESSION_FAILED',
          message: 'Error creando sesión de checkout',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
