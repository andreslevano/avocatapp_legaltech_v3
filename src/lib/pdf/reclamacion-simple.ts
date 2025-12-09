import PDFDocument from 'pdfkit';
import { ModelOutput } from '../validate-reclamacion';

export async function renderReclamacionPDF(
  model: ModelOutput, 
  cuantia: number, 
  precision: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 60,
          right: 60
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Título principal
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(model.encabezado.toUpperCase(), { align: 'center' });
      
      // Información de cuantía y precisión
      doc.fontSize(8)
         .font('Helvetica')
         .text(`Cuantía reclamada: ${cuantia.toLocaleString('es-ES')} €`, { align: 'center' });
      
      if (precision > 0) {
        doc.text(`Precisión OCR: ≈ ${precision}%`, { align: 'center' });
      }
      
      doc.moveDown(1);

      // Partes
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('PARTES', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(model.partes);

      doc.moveDown(1);

      // Hechos
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('HECHOS', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica');
      
      model.hechos.forEach((hecho, index) => {
        doc.text(`${index + 1}. ${hecho}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Fundamentos de Derecho
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('FUNDAMENTOS DE DERECHO', { underline: true });

      // Competencia y Procedimiento
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Competencia y Procedimiento:');
      
      doc.fontSize(10)
         .font('Helvetica');
      model.fundamentos.competencia.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Legitimación
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Legitimación:');
      
      doc.fontSize(10)
         .font('Helvetica');
      model.fundamentos.legitimacion.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Fondo del Asunto
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Fondo del Asunto:');
      
      doc.fontSize(10)
         .font('Helvetica');
      model.fundamentos.fondo.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Intereses y Costas
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Intereses y Costas:');
      
      doc.fontSize(10)
         .font('Helvetica');
      model.fundamentos.interesesYCostas.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(1);

      // Súplica
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('SÚPLICA', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica');
      model.suplico.forEach((suplico, index) => {
        doc.text(`${index + 1}. ${suplico}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Otrosí
      if (model.otrosi && model.otrosi.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('OTROSÍ DIGO', { underline: true });
        
        doc.fontSize(10)
           .font('Helvetica');
        model.otrosi.forEach((otrosi, index) => {
          doc.text(`${index + 1}. ${otrosi}`);
          doc.moveDown(0.5);
        });

        doc.moveDown(1);
      }

      // Documentos
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('DOCUMENTOS APORTADOS', { underline: true });
      
      doc.fontSize(10)
         .font('Helvetica');
      model.documentos.forEach((docItem, index) => {
        doc.text(`• ${docItem}`);
      });

      doc.moveDown(1);

      // Lugar, Fecha y Firma
      doc.fontSize(10)
         .font('Helvetica')
         .text(model.lugarFecha, { align: 'right' });

      doc.moveDown(1);

      // Notas Pro Se (si aplica)
      if (model.notasProSe && model.notasProSe.length > 0) {
        doc.addPage();
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('NOTAS PARA PRESENTACIÓN "PRO SE" (SIN ABOGADO/PROCURADOR)', { underline: true });
        
        doc.fontSize(10)
           .font('Helvetica');
        model.notasProSe.forEach((nota, index) => {
          doc.text(`• ${nota}`);
          doc.moveDown(0.5);
        });
      }

      // Citas (si aplica)
      if (model.citas && model.citas.length > 0) {
        doc.addPage();
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('CITAS LEGALES:', { underline: true });
        
        doc.font('Helvetica');
        model.citas.forEach(cita => {
          doc.text(`• ${cita}`);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
