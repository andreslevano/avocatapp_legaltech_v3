import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    console.log('Iniciando generación de PDF', { requestId });
    
    const body = await request.json();
    const { userData, userSummary } = body;

    if (!userData || !userSummary) {
      console.error('Datos de usuario faltantes', { userData: !!userData, userSummary: !!userSummary });
      return NextResponse.json(
        { success: false, error: 'Datos de usuario requeridos' },
        { status: 400 }
      );
    }

    console.log('Datos recibidos', { 
      userId: userData.uid, 
      email: userData.email,
      hasUserSummary: !!userSummary 
    });

    // Generar PDF simple sin ChatGPT por ahora
    console.log('Generando PDF simple', { requestId });
    const pdfBuffer = await generateSimplePDF(userData, userSummary);
    console.log('PDF generado', { bufferSize: pdfBuffer.length });

    console.log('PDF generado exitosamente', { 
      requestId, 
      elapsedMs: Date.now() - startTime
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="email_fidelizacion_${userData.uid}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generando PDF', { 
      requestId, 
      error: error.message, 
      stack: error.stack,
      elapsedMs: Date.now() - startTime 
    });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function generateSimplePDF(userData: any, userSummary: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      let buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Título
      doc.fontSize(20).text('Email de Fidelización', { align: 'center' });
      doc.moveDown(1);

      // Información del destinatario
      doc.fontSize(12).text('Para:', { continued: true });
      doc.text(` ${userData.displayName || 'Cliente'} (${userData.email})`);
      doc.text(`Plan: ${userData.subscription?.plan || 'Gratuito'}`);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`);
      doc.moveDown(1);

      // Asunto
      doc.fontSize(14).text('Asunto:', { underline: true });
      doc.fontSize(12).text(`Actualización de tu cuenta - ${userData.displayName || 'Cliente'}`, { indent: 20 });
      doc.moveDown(1);

      // Contenido del email
      doc.fontSize(14).text('Contenido del Email:', { underline: true });
      doc.fontSize(12);
      
      const emailContent = `
Estimado/a ${userData.displayName || 'Cliente'},

Esperamos que se encuentre bien. Nos complace informarle sobre el estado actual de su cuenta en nuestra plataforma legal.

ESTADÍSTICAS DE SU CUENTA:
• Documentos generados: ${userSummary.summary.totalDocuments}
• Inversión total: €${userSummary.summary.totalSpent}
• Tasa de éxito: ${(userSummary.summary.successRate * 100).toFixed(1)}%
• Plan actual: ${userData.subscription?.plan || 'Gratuito'}

ACTIVIDAD RECIENTE:
${userSummary.recentGenerations.slice(0, 3).map((gen: any, index: number) => 
  `${index + 1}. ${gen.tipoEscrito} (${gen.areaLegal}) - ${new Date(gen.createdAt).toLocaleDateString('es-ES')}`
).join('\n')}

RECOMENDACIONES:
1. Considere actualizar a un plan premium para acceder a más funciones
2. Explore nuestras nuevas plantillas de documentos
3. Únase a nuestros webinars semanales de formación

PRÓXIMOS PASOS:
1. Revise su historial de documentos
2. Explore las nuevas funcionalidades disponibles
3. Contacte con nuestro equipo de soporte si necesita ayuda

Gracias por confiar en nosotros.

Atentamente,
El equipo de Avocat LegalTech
      `;
      
      // Dividir el contenido en líneas y agregar al PDF
      const lines = emailContent.split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) {
          doc.text(line, { indent: 20, align: 'justify' });
        } else {
          doc.moveDown(0.5);
        }
      });
      
      doc.moveDown(1);

      // Sugerencias
      doc.fontSize(14).text('Sugerencias:', { underline: true });
      doc.fontSize(12);
      const suggestions = [
        'Actualizar a plan premium',
        'Explorar nuevas plantillas',
        'Participar en webinars'
      ];
      suggestions.forEach((suggestion: string, index: number) => {
        doc.text(`${index + 1}. ${suggestion}`, { indent: 20 });
      });
      doc.moveDown(1);

      // Próximas acciones
      doc.fontSize(14).text('Próximas Acciones:', { underline: true });
      doc.fontSize(12);
      const actions = [
        'Revisar historial de documentos',
        'Explorar nuevas funcionalidades',
        'Contactar soporte técnico'
      ];
      actions.forEach((action: string, index: number) => {
        doc.text(`${index + 1}. ${action}`, { indent: 20 });
      });

      // Pie de página
      doc.moveDown(2);
      doc.fontSize(10).text(
        `Generado por IA - ${new Date().toLocaleString('es-ES')}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error('Error en generateSimplePDF:', error);
      reject(error);
    }
  });
}