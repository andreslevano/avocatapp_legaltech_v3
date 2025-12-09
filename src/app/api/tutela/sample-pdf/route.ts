import { NextRequest, NextResponse } from 'next/server';
import { generateTutelaSamplePDF } from '@/lib/pdf/tutela-sample';

export const runtime = 'nodejs' as const;

export async function GET() {
  try {
    console.log('📄 Generando PDF de muestra para Tutela...');
    
    const pdfBuffer = await generateTutelaSamplePDF();
    
    console.log(`✅ PDF generado: ${pdfBuffer.length} bytes`);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="tutela-sample.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error generando PDF de muestra:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


