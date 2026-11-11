import PDFDocument from 'pdfkit';
import { registerDocumentFonts, DOC_FONT } from './fonts';

export async function generateTutelaSamplePDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    registerDocumentFonts(doc); // DS v4: EB Garamond (falls back to Times)

    let buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Título
    doc.fontSize(20)
       .font(DOC_FONT.heading)
       .text('ACCIÓN DE TUTELA', { align: 'center' });

    doc.moveDown(2);

    // Datos del solicitante
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('DATOS DEL SOLICITANTE:')
       .font(DOC_FONT.body)
       .text('Nombre: Juan Carlos Pérez García')
       .text('Cédula: 12.345.678')
       .text('Dirección: Calle 123 #45-67, Bogotá')
       .text('Teléfono: 300-123-4567')
       .text('Email: juan.perez@email.com');

    doc.moveDown();

    // Datos del demandado
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('DATOS DEL DEMANDADO:')
       .font(DOC_FONT.body)
       .text('Entidad: EPS Sanitas S.A.S.')
       .text('NIT: 900.123.456-7')
       .text('Dirección: Carrera 15 #93-47, Bogotá');

    doc.moveDown();

    // Derecho vulnerado
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('DERECHO VULNERADO:')
       .font(DOC_FONT.body)
       .text('Derecho a la salud (Artículo 49 de la Constitución Política)');

    doc.moveDown();

    // Hechos
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('HECHOS:')
       .font(DOC_FONT.body)
       .text('1. El señor Juan Carlos Pérez García se encuentra afiliado a la EPS Sanitas desde el año 2020.')
       .text('2. El 15 de marzo de 2024, el señor Pérez fue diagnosticado con una enfermedad que requiere tratamiento especializado.')
       .text('3. El médico tratante prescribió una cirugía que debe realizarse en un plazo máximo de 30 días.')
       .text('4. A pesar de las múltiples solicitudes, la EPS Sanitas ha negado la autorización del procedimiento.')
       .text('5. La negativa de la EPS pone en riesgo la vida y salud del solicitante.');

    doc.moveDown();

    // Fundamentos
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('FUNDAMENTOS DE DERECHO:')
       .font(DOC_FONT.body)
       .text('El artículo 86 de la Constitución Política establece que toda persona tiene derecho a la acción de tutela.')
       .text('El artículo 49 de la Constitución consagra el derecho fundamental a la salud.')
       .text('La Ley 1751 de 2015 establece el derecho fundamental a la salud como servicio público esencial.');

    doc.moveDown();

    // Peticiones
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('PETICIONES:')
       .font(DOC_FONT.body)
       .text('1. ORDENAR a la EPS Sanitas S.A.S. que autorice y financie la cirugía prescrita por el médico tratante.')
       .text('2. ORDENAR que la autorización se otorgue en un plazo máximo de 48 horas.')
       .text('3. ORDENAR que se garantice el seguimiento y control post-operatorio.');

    doc.moveDown();

    // Medidas provisionales
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('MEDIDAS PROVISIONALES:')
       .font(DOC_FONT.body)
       .text('Se solicita al Juez que ordene a la EPS Sanitas la autorización inmediata del procedimiento quirúrgico.');

    doc.moveDown();

    // Pruebas
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('PRUEBAS:')
       .font(DOC_FONT.body)
       .text('1. Historia clínica del solicitante')
       .text('2. Concepto médico que prescribe la cirugía')
       .text('3. Respuestas de la EPS negando la autorización')
       .text('4. Certificado de afiliación a la EPS');

    doc.moveDown();

    // Anexos
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('ANEXOS:')
       .font(DOC_FONT.body)
       .text('1. Copia de la cédula de ciudadanía')
       .text('2. Copia del carné de afiliación a la EPS')
       .text('3. Historia clínica')
       .text('4. Concepto médico')
       .text('5. Comunicaciones con la EPS');

    doc.moveDown();

    // Juramento
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('JURAMENTO:')
       .font(DOC_FONT.body)
       .text('Juro bajo la gravedad del juramento que los hechos narrados son ciertos y que no he promovido otra acción de tutela por los mismos hechos.');

    doc.moveDown();

    // Lugar y fecha
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('LUGAR Y FECHA:')
       .font(DOC_FONT.body)
       .text('Bogotá D.C., 25 de septiembre de 2024');

    doc.moveDown(2);

    // Firma
    doc.fontSize(14)
       .font(DOC_FONT.heading)
       .text('_________________________')
       .text('JUAN CARLOS PÉREZ GARCÍA')
       .text('C.C. 12.345.678');

    doc.end();
  });
}


