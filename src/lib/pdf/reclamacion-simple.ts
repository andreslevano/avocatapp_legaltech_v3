import PDFDocument from './pdfkit';
import { ModelOutput } from '../validate-reclamacion';
import { applyPdfFonts, PDF_FONT_FAMILY, PDF_FONT_PATHS } from './fonts';

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
        },
        font: PDF_FONT_PATHS.regular
      });

      applyPdfFonts(doc);

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Título principal
      doc.fontSize(14)
         .font(PDF_FONT_FAMILY.bold)
         .text(model.encabezado.toUpperCase(), { align: 'center' });
      
      // Información de cuantía y precisión
      doc.fontSize(8)
         .font(PDF_FONT_FAMILY.regular)
         .text(`Cuantía reclamada: ${cuantia.toLocaleString('es-ES')} €`, { align: 'center' });
      
      if (precision > 0) {
        doc.text(`Precisión OCR: ≈ ${precision}%`, { align: 'center' });
      }
      
      doc.moveDown(1);

      // Partes
      doc.fontSize(12)
         .font(PDF_FONT_FAMILY.bold)
         .text('PARTES', { underline: true });
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular)
         .text(model.partes);

      doc.moveDown(1);

      // Hechos
      doc.fontSize(12)
         .font(PDF_FONT_FAMILY.bold)
         .text('HECHOS', { underline: true });
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      
      model.hechos.forEach((hecho, index) => {
        doc.text(`${index + 1}. ${hecho}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Fundamentos de Derecho
      doc.fontSize(12)
         .font(PDF_FONT_FAMILY.bold)
         .text('FUNDAMENTOS DE DERECHO', { underline: true });

      // Competencia y Procedimiento
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.bold)
         .text('Competencia y Procedimiento:');
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.fundamentos.competencia.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Legitimación
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.bold)
         .text('Legitimación:');
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.fundamentos.legitimacion.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Fondo del Asunto
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.bold)
         .text('Fondo del Asunto:');
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.fundamentos.fondo.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(0.5);

      // Intereses y Costas
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.bold)
         .text('Intereses y Costas:');
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.fundamentos.interesesYCostas.forEach(fundamento => {
        doc.text(`• ${fundamento}`);
      });

      doc.moveDown(1);

      // Súplica
      doc.fontSize(12)
         .font(PDF_FONT_FAMILY.bold)
         .text('SÚPLICA', { underline: true });
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.suplico.forEach((suplico, index) => {
        doc.text(`${index + 1}. ${suplico}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Otrosí
      if (model.otrosi && model.otrosi.length > 0) {
        doc.fontSize(12)
           .font(PDF_FONT_FAMILY.bold)
           .text('OTROSÍ DIGO', { underline: true });
        
        doc.fontSize(10)
           .font(PDF_FONT_FAMILY.regular);
        model.otrosi.forEach((otrosi, index) => {
          doc.text(`${index + 1}. ${otrosi}`);
          doc.moveDown(0.5);
        });

        doc.moveDown(1);
      }

      // Documentos
      doc.fontSize(12)
         .font(PDF_FONT_FAMILY.bold)
         .text('DOCUMENTOS APORTADOS', { underline: true });
      
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular);
      model.documentos.forEach((docItem, index) => {
        doc.text(`• ${docItem}`);
      });

      doc.moveDown(1);

      // Lugar, Fecha y Firma
      doc.fontSize(10)
         .font(PDF_FONT_FAMILY.regular)
         .text(model.lugarFecha, { align: 'right' });

      doc.moveDown(1);

      // Notas Pro Se (si aplica)
      if (model.notasProSe && model.notasProSe.length > 0) {
        doc.addPage();
        doc.fontSize(12)
           .font(PDF_FONT_FAMILY.bold)
           .text('NOTAS PARA PRESENTACIÓN "PRO SE" (SIN ABOGADO/PROCURADOR)', { underline: true });
        
        doc.fontSize(10)
           .font(PDF_FONT_FAMILY.regular);
        model.notasProSe.forEach((nota, index) => {
          doc.text(`• ${nota}`);
          doc.moveDown(0.5);
        });
      }

      // Citas (si aplica)
      if (model.citas && model.citas.length > 0) {
        doc.addPage();
        doc.fontSize(12)
           .font(PDF_FONT_FAMILY.bold)
           .text('CITAS LEGALES:', { underline: true });
        
        doc.font(PDF_FONT_FAMILY.regular);
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
