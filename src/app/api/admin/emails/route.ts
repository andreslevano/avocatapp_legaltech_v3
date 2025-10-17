import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const emailType = searchParams.get('emailType');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('📧 Obteniendo emails generados...', { userId, emailType, limit });

    let query = db().collection('generated_emails').orderBy('createdAt', 'desc');

    // Filtrar por usuario si se especifica
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filtrar por tipo de email si se especifica
    if (emailType) {
      query = query.where('emailType', '==', emailType);
    }

    // Limitar resultados
    query = query.limit(limit);

    const snapshot = await query.get();
    const emails = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ ${emails.length} emails encontrados`);

    return NextResponse.json({
      success: true,
      data: {
        emails,
        total: emails.length,
        filters: {
          userId,
          emailType,
          limit
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo emails:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


