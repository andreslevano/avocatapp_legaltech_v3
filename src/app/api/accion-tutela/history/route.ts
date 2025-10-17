import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getHistoryByUser } from '@/lib/simple-storage';

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid') || 'demo_user';
    
    console.log('Tutela historial request', { requestId, uid });
    
    // Leer desde storage simplificado
    const items = await getHistoryByUser(uid);
    
    // Filtrar solo tutelas
    const tutelaItems = items.filter(item => item.titulo === 'accion_tutela');
    
    // Ordenar por fecha descendente y limitar a 50
    const sortedItems = tutelaItems
      .sort((a, b) => new Date(b.fechaISO).getTime() - new Date(a.fechaISO).getTime())
      .slice(0, 50);
    
    const elapsedMs = Date.now() - startTime;
    
    console.log('Tutela historial success', {
      requestId,
      totalItems: sortedItems.length,
      elapsedMs
    });
    
    return NextResponse.json({
      success: true,
      data: {
        items: sortedItems,
        total: sortedItems.length,
        metadata: {
          totalItems: sortedItems.length,
          elapsedMs,
          source: 'simple-storage'
        }
      }
    });
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error('Tutela historial error', { requestId, error: error.message, elapsedMs });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HISTORY_FAILED',
          message: 'Error obteniendo el historial de tutelas',
          hint: 'Intenta de nuevo o contacta soporte'
        }
      },
      { status: 500 }
    );
  }
}

