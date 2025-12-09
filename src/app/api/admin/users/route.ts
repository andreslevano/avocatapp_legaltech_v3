import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Obteniendo usuarios de Firestore...');
    
    // Obtener todos los usuarios de Firestore
    const snapshot = await db().collection('users').get();
    
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Usuarios obtenidos: ${users.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user: any) => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isActive: user.isActive || true,
          role: user.role || 'user',
          stats: user.stats || {
            totalDocuments: 0,
            totalGenerations: 0,
            totalSpent: 0
          },
          subscription: user.subscription || {
            plan: 'free',
            isActive: true
          }
        })),
        total: users.length
      }
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo usuarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_ERROR',
          message: 'Error obteniendo usuarios',
          hint: 'Verifica la conexión a Firestore'
        }
      },
      { status: 500 }
    );
  }
}


