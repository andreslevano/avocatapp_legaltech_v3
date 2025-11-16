import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerEmail, successUrl, cancelUrl } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      );
    }

    // IMPORTANT: Do NOT create purchase records here.
    // Purchases are ONLY created after successful payment via the webhook handler
    // (src/lib/stripe.ts -> processCheckoutSession -> called by webhook on checkout.session.completed)

    // Create line items for Stripe checkout
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
        userId: body.userId || 'unknown',
      },
    });
    
    // Return checkout session URL - user will be redirected to Stripe
    // Purchase will be created ONLY after successful payment via webhook
    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error creating checkout session'
      },
      { status: 500 }
    );
  }
}
