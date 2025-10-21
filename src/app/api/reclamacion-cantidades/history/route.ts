import { NextRequest, NextResponse } from 'next/server';
import { obtenerHistorial, obtenerResumenHistorial } from '@/lib/historial';
// import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { getHistoryByUser } from '@/lib/simple-storage';

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid') || 'demo_user'; // TODO: Obtener del auth real
    
    console.log('Historial request', { requestId, uid });
    
    // Leer desde storage simplificado
    const items = await getHistoryByUser(uid);
    
    // Calcular resumen
    const resumen = {
      totalPrecios: items.reduce((sum, item) => sum + (item.precio || 0), 0),
      totalDocs: items.reduce((sum, item) => sum + (item.documentos || 0), 0),
      totalReclamado: items.reduce((sum, item) => sum + (item.cuantia || 0), 0),
      totalItems: items.length
    };
    
    const elapsedMs = Date.now() - startTime;
    
    console.log('Historial success', {
      requestId,
      totalItems: items.length,
      resumen,
      elapsedMs
    });
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        resumen,
        metadata: {
          totalItems: items.length,
          elapsedMs,
          source: 'firestore'
        }
      }
    });
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error('Historial error', { requestId, error: error instanceof Error ? error.message : String(error), elapsedMs });
    
    // Fallback al historial en memoria
    try {
      const historial = obtenerHistorial();
      const resumen = obtenerResumenHistorial();
      
      return NextResponse.json({
        success: true,
        data: {
          items: historial,
          resumen,
          metadata: {
            totalItems: historial.length,
            elapsedMs,
            source: 'memory_fallback'
          }
        }
      });
    } catch (_fallbackError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'HISTORY_FAILED',
            message: 'Error obteniendo el historial',
            hint: 'Intenta de nuevo o contacta soporte'
          }
        },
        { status: 500 }
      );
    }
  }
}
