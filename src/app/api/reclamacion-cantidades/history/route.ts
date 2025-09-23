import { NextRequest, NextResponse } from 'next/server';
import { obtenerHistorial, obtenerResumenHistorial } from '@/lib/historial';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    apiLogger.info(requestId, 'Historial request');
    
    const historial = obtenerHistorial();
    const resumen = obtenerResumenHistorial();
    
    const elapsedMs = Date.now() - startTime;
    
    apiLogger.success(requestId, {
      totalItems: historial.length,
      resumen,
      elapsedMs
    });
    
    return NextResponse.json({
      success: true,
      data: {
        items: historial,
        resumen,
        metadata: {
          totalItems: historial.length,
          elapsedMs
        }
      }
    });
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, error, { elapsedMs });
    
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
