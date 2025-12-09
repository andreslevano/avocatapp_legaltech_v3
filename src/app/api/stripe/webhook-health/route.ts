import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

/**
 * Health check endpoint for webhook handler
 * GET /api/stripe/webhook-health
 */
export async function GET(request: NextRequest) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        firebase: false,
        recentPurchases: 0,
        recentWebhookPurchases: 0
      }
    };

    // Check Firebase connection
    try {
      const testQuery = await db().collection('purchases').limit(1).get();
      health.checks.firebase = true;
      
      // Count recent purchases (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const recentPurchases = await db().collection('purchases')
        .where('createdAt', '>=', oneDayAgo)
        .get();
      
      health.checks.recentPurchases = recentPurchases.size;
      
      // Count webhook-created purchases (have stripeSessionId)
      const webhookPurchases = recentPurchases.docs.filter(doc => {
        const data = doc.data();
        return !!data.stripeSessionId;
      });
      
      health.checks.recentWebhookPurchases = webhookPurchases.length;
      
      // Check for problematic purchases (pending without documents)
      const problematicPurchases = recentPurchases.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'pending' && 
               !data.stripeSessionId && 
               (!data.items || !data.items.some((item: any) => item.packageFiles));
      });
      
      if (problematicPurchases.length > 0) {
        health.status = 'warning';
        (health as any).warnings = {
          problematicPurchases: problematicPurchases.map(doc => ({
            id: doc.id,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
            status: doc.data().status
          }))
        };
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.checks.firebase = false;
      (health as any).error = error instanceof Error ? error.message : 'Unknown error';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 500;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}



