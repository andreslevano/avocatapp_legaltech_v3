import PDFDocument from 'pdfkit';
import { TutelaModel } from '../validate-tutela';

export async function renderTutelaPDF(modelo: TutelaModel): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 60,
      bottom: 60,
      left: 60,
      right: 60
    }
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on('error', reject);

    // TÍTULO PRINCIPAL
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('ACCIÓN DE TUTELA', { align: 'center' });
    
    doc.moveDown(2);

    // ENCABEZADO
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('ENCABEZADO', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(modelo.encabezado);
    
    doc.moveDown(1);

    // PARTES
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PARTES', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(modelo.partes);
    
    doc.moveDown(1);

    // HECHOS
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('HECHOS', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica');
    
    modelo.hechos.forEach((hecho, index) => {
      doc.text(`${index + 1}. ${hecho}`);
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);

    // FUNDAMENTOS
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('FUNDAMENTOS DE DERECHO', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica');

    // Competencia
    doc.font('Helvetica-Bold').text('COMPETENCIA:', { continued: true });
    doc.font('Helvetica').text(` ${modelo.competencia.juez}`);
    doc.moveDown(0.3);
    
    modelo.competencia.razones.forEach(razon => {
      doc.text(`• ${razon}`, { indent: 20 });
    });
    doc.moveDown(0.5);

    // Legitimación
    doc.font('Helvetica-Bold').text('LEGITIMACIÓN:', { continued: true });
    doc.font('Helvetica').text(' En la activa y en la pasiva');
    doc.moveDown(0.3);
    
    modelo.fundamentos.legitimacion.forEach(legitimacion => {
      doc.text(`• ${legitimacion}`, { indent: 20 });
    });
    doc.moveDown(0.5);

    // Subsidiariedad
    doc.font('Helvetica-Bold').text('SUBSIDIARIEDAD:', { continued: true });
    doc.font('Helvetica').text(' Procedencia preferente e inmediata');
    doc.moveDown(0.3);
    
    modelo.fundamentos.subsidiariedad.forEach(subsidiariedad => {
      doc.text(`• ${subsidiariedad}`, { indent: 20 });
    });
    doc.moveDown(0.5);

    // Inmediatez
    doc.font('Helvetica-Bold').text('INMEDIATEZ:', { continued: true });
    doc.font('Helvetica').text(' Oportunidad de la acción');
    doc.moveDown(0.3);
    
    modelo.fundamentos.inmediatez.forEach(inmediatez => {
      doc.text(`• ${inmediatez}`, { indent: 20 });
    });
    doc.moveDown(0.5);

    // Fondo
    doc.font('Helvetica-Bold').text('FONDO:', { continued: true });
    doc.font('Helvetica').text(' Derecho fundamental invocado');
    doc.moveDown(0.3);
    
    modelo.fundamentos.fondo.forEach(fondo => {
      doc.text(`• ${fondo}`, { indent: 20 });
    });
    doc.moveDown(1);

    // PETICIONES
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PETICIONES', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica');
    
    modelo.peticiones.forEach((peticion, index) => {
      doc.text(`${index + 1}. ${peticion}`);
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);

    // MEDIDA PROVISIONAL (si aplica)
    if (modelo.medidaProvisional && modelo.medidaProvisional.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('MEDIDA PROVISIONAL', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica');
      
      modelo.medidaProvisional.forEach((medida, index) => {
        doc.text(`${index + 1}. ${medida}`);
        doc.moveDown(0.5);
      });
      
      doc.moveDown(1);
    }

    // PRUEBAS
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PRUEBAS', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica');
    
    modelo.pruebas.forEach((prueba, index) => {
      doc.text(`${index + 1}. ${prueba}`);
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);

    // ANEXOS
    if (modelo.anexos.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('ANEXOS', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica');
      
      modelo.anexos.forEach((anexo, index) => {
        doc.text(`${index + 1}. ${anexo}`);
        doc.moveDown(0.5);
      });
      
      doc.moveDown(1);
    }

    // JURAMENTO
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('JURAMENTO', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(modelo.juramento);
    
    doc.moveDown(1);

    // LUGAR Y FECHA
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('LUGAR Y FECHA', { underline: true });
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(modelo.lugarFecha);
    
    doc.moveDown(2);

    // NOTAS (en página separada si hay espacio)
    if (modelo.notas.length > 0) {
      doc.addPage();
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('NOTAS IMPORTANTES', { align: 'center' });
      
      doc.moveDown(1);
      
      doc.fontSize(10)
         .font('Helvetica');
      
      modelo.notas.forEach((nota, index) => {
        doc.text(`${index + 1}. ${nota}`);
        doc.moveDown(0.5);
      });
    }

    // Pie de página
    const pageNumber = (page: number, totalPages: number) => {
      doc.fontSize(8)
         .font('Helvetica')
         .text(`Página ${page} de ${totalPages}`, 
               doc.page.width - 100, 
               doc.page.height - 30, 
               { align: 'center' });
    };

    doc.on('pageAdded', () => {
      const currentPageNumber = doc.bufferedPageRange().count;
      const totalPages = doc.bufferedPageRange().count;
      pageNumber(currentPageNumber, totalPages);
    });

    doc.end();
  });
}

