import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Planes de suscripción
export const SUBSCRIPTION_PLANS = {
  student: {
    id: 'student',
    name: 'Estudiante',
    price: 0,
    features: ['Generación básica de documentos', 'Plantillas limitadas'],
    limits: {
      documentsPerMonth: 10,
      templates: 5
    }
  },
  pro: {
    id: 'pro',
    name: 'Profesional',
    price: 29.99,
    priceId: 'price_pro_monthly', // ID de precio en Stripe
    features: ['Generación ilimitada', 'Todas las plantillas', 'Soporte prioritario'],
    limits: {
      documentsPerMonth: -1, // Ilimitado
      templates: -1
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    price: 99.99,
    priceId: 'price_enterprise_monthly',
    features: ['Todo lo de Pro', 'API personalizada', 'Soporte dedicado'],
    limits: {
      documentsPerMonth: -1,
      templates: -1
    }
  }
};

export const createCheckoutSession = async (planId: string, userId: string, successUrl?: string, cancelUrl?: string) => {
  const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
  
  if (!plan || !('priceId' in plan) || !plan.priceId) {
    throw new Error('Plan not found or no price ID');
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
      planId,
    },
    customer_email: undefined, // Se puede obtener del usuario autenticado
  });
  
  return session;
};

export const handleWebhook = async (payload: string, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new Error('Invalid signature');
  }
  
  // Manejar diferentes tipos de eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);
      // Aquí actualizarías la base de datos para marcar al usuario como pro
      break;
      
    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription created:', subscription.id);
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log('Subscription updated:', updatedSubscription.id);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', deletedSubscription.id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  return { received: true };
};