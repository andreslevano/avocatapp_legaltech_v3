import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/stripe';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// NOTE: This route is handled by Firebase Cloud Functions in production via firebase.json rewrite
// The dynamic export is removed to allow static export for Firebase Hosting
// For local development, use: stripe listen --forward-to localhost:3000/api/stripe/webhook
// export const runtime = 'nodejs';
// export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    // Get raw body as text - CRITICAL for Stripe signature verification
    // Must use .text() not .json() to preserve exact body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    // Debug logging (remove in production if sensitive)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${requestId}] 📥 Raw body length:`, body.length);
      console.log(`[${requestId}] 📥 Signature header:`, signature ? 'Present' : 'Missing');
    }
    
    if (!signature) {
      console.error(`[${requestId}] ❌ Missing Stripe signature header`);
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
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error(`[${requestId}] ❌ STRIPE_WEBHOOK_SECRET not configured`);
      apiLogger.error(requestId, new Error('STRIPE_WEBHOOK_SECRET not configured'));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'WEBHOOK_SECRET_MISSING',
            message: 'Webhook secret no configurado',
            hint: 'Configura STRIPE_WEBHOOK_SECRET en las variables de entorno'
          }
        },
        { status: 500 }
      );
    }
    
    console.log(`[${requestId}] 📥 Webhook recibido, procesando...`);
    const result = await handleWebhook(body, signature);
    
    console.log(`[${requestId}] ✅ Webhook procesado exitosamente`);
    apiLogger.success(requestId, { webhook: 'processed' });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Error procesando webhook:`, error);
    apiLogger.error(requestId, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isSignatureError = errorMessage.includes('signature') || errorMessage.includes('Invalid');
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isSignatureError ? 'INVALID_SIGNATURE' : 'WEBHOOK_PROCESSING_FAILED',
          message: 'Error procesando webhook',
          hint: isSignatureError 
            ? 'Verifica que STRIPE_WEBHOOK_SECRET coincida con el secret de Stripe Dashboard'
            : 'Verifica la configuración y logs del servidor',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }
      },
      { status: isSignatureError ? 401 : 500 }
    );
  }
}
