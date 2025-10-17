import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 Test audit endpoint called');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    // Respuesta simple de prueba
    const resultado = {
      reporteAuditoria: [
        "✅ Test audit completed",
        "✅ Basic validation passed",
        "✅ Simple response generated"
      ],
      escritoFinal: "# TEST AUDIT RESULT\n\nThis is a test response from the audit endpoint.",
      checklistPrevia: [
        "□ Test item 1",
        "□ Test item 2",
        "□ Test item 3"
      ],
      variantesProcedimiento: {
        "TEST_PROCEDURE": {
          "cambios": ["Test change 1", "Test change 2"],
          "normas": ["Test norm 1", "Test norm 2"]
        }
      },
      camposVariables: {
        "test": {
          "campo1": "Test value 1",
          "campo2": "Test value 2"
        }
      }
    };
    
    return NextResponse.json({
      success: true,
      data: {
        id: 'test-audit-123',
        resultado,
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test audit error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEST_AUDIT_FAILED',
          message: 'Error en el test de auditoría',
          hint: 'Verifica el endpoint de prueba'
        }
      },
      { status: 500 }
    );
  }
}
