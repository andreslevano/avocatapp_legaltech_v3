import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Reclamación de Cantidades - Endpoint Simple');
    
    const body = await request.json();
    console.log('📝 Datos recibidos:', body);
    
    // Validación básica
    if (!body.nombreTrabajador || !body.nombreEmpresa) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan datos obligatorios'
        },
        { status: 400 }
      );
    }
    
    // Simular generación de PDF
    const pdfContent = `RECLAMACIÓN DE CANTIDADES

Estimado/a Sr./Sra.,

Por medio del presente, me dirijo a ustedes para reclamar las cantidades adeudadas por la empresa en concepto de salarios, horas extras y otros conceptos laborales.

DETALLES DE LA RECLAMACIÓN:
- Trabajador: ${body.nombreTrabajador}
- Empresa: ${body.nombreEmpresa}
- Período: [PERÍODO]
- Conceptos adeudados: [CONCEPTOS]
- Importe total: [IMPORTE] €
- Intereses de demora: [INTERESES] €

FUNDAMENTOS LEGALES:
- Artículo 26 del Estatuto de los Trabajadores
- Convenio Colectivo aplicable
- Jurisprudencia del Tribunal Supremo

SOLICITUD:
Se solicita el pago íntegro de las cantidades adeudadas más los intereses de demora correspondientes, en un plazo máximo de 15 días naturales.

En caso de no recibir respuesta satisfactoria, se procederá a interponer la correspondiente demanda judicial.

A la espera de su respuesta,

[FIRMA]`;

    // Crear PDF simple
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECLAMACIÓN DE CANTIDADES', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const lines = pdfContent.split('\n');
    let yPosition = 40;
    const lineHeight = 6;
    const maxWidth = 170;
    const leftMargin = 20;
    
    lines.forEach(line => {
      if (line.trim() === '') {
        yPosition += lineHeight;
        return;
      }
      
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      const words = line.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine + word + ' ';
        const textWidth = doc.getTextWidth(testLine);
        
        if (textWidth > maxWidth && currentLine !== '') {
          doc.text(currentLine, leftMargin, yPosition);
          yPosition += lineHeight;
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        doc.text(currentLine, leftMargin, yPosition);
        yPosition += lineHeight;
      }
    });
    
    const pdfBuffer = doc.output('arraybuffer');
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reclamacion-cantidades-${body.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('❌ Error generando Reclamación de Cantidades:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error generando el documento'
      },
      { status: 500 }
    );
  }
}


