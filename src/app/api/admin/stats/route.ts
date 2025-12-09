import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function GET(_request: NextRequest) {
  try {
    console.log('📊 Obteniendo estadísticas globales...');
    
    // Obtener usuarios
    const usersSnapshot = await db().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calcular estadísticas
    const activeUsers = users.filter((u: any) => u.isActive !== false);
    const totalRevenue = users.reduce((sum, u: any) => sum + (u.stats?.totalSpent || 0), 0);
    const totalDocuments = users.reduce((sum, u: any) => sum + (u.stats?.totalDocuments || 0), 0);
    
    const stats = {
      users: {
        total: users.length,
        active: activeUsers.length,
        newThisMonth: users.filter((u: any) => {
          const createdAt = new Date(u.createdAt);
          const now = new Date();
          return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
        }).length
      },
      documents: {
        total: totalDocuments,
        averagePerUser: users.length > 0 ? totalDocuments / users.length : 0
      },
      revenue: {
        total: totalRevenue,
        averagePerUser: users.length > 0 ? totalRevenue / users.length : 0
      }
    };

    console.log(`✅ Estadísticas calculadas: ${users.length} usuarios, ${totalDocuments} documentos`);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_ERROR',
          message: 'Error obteniendo estadísticas globales',
          hint: 'Verifica la conexión a Firestore'
        }
      },
      { status: 500 }
    );
  }
}

