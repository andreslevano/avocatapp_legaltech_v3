import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/stripe';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      apiLogger.error(requestId, new Error('Missing stripe signature'));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Firma de Stripe faltante',
            hint: 'Verifica la configuración del webhook'
          }
        },
        { status: 400 }
      );
    }
    
    const result = await handleWebhook(body, signature);
    
    apiLogger.success(requestId, { webhook: 'processed' });
    
    return NextResponse.json(result);
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: 'Error procesando webhook',
          hint: 'Verifica la configuración'
        }
      },
      { status: 400 }
    );
  }
}
