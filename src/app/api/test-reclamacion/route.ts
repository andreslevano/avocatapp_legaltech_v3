import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test endpoint llamado');
    
    const body = await request.json();
    console.log('📝 Datos recibidos:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint funcionando',
      data: body
    });
    
  } catch (error) {
    console.error('❌ Error en test endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error en test endpoint'
      },
      { status: 500 }
    );
  }
}


