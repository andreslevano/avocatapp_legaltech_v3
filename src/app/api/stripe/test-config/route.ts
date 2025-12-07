import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeAmount = process.env.STRIPE_RECLAMACION_UNIT_AMOUNT;
    const nodeEnv = process.env.NODE_ENV;
    
    return NextResponse.json({
      success: true,
      config: {
        hasStripeKey: !!stripeKey,
        stripeKeyLength: stripeKey?.length || 0,
        stripeKeyPrefix: stripeKey?.substring(0, 10) || 'N/A',
        stripeKeyIsPlaceholder: stripeKey === 'your_stripe_secret_key_here',
        stripeAmount: stripeAmount || 'not set',
        nodeEnv: nodeEnv || 'not set',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

