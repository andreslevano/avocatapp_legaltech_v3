import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test Reclamación endpoint');
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint funcionando correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}


