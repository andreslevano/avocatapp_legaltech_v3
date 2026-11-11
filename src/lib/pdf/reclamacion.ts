import PDFDocument from 'pdfkit';
import { ModelOutput } from '../validate-reclamacion';
import { registerDocumentFonts, DOC_FONT } from './fonts';

export async function renderReclamacionPDF(
  model: ModelOutput, 
  cuantia: number, 
  precision: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 60,
        right: 60
      }
    });
    registerDocumentFonts(doc); // DS v4: EB Garamond (falls back to Times)

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    try {
      // Configurar fuente y estilos
      const titleFontSize = 14;
      const sectionFontSize = 12;
      const bodyFontSize = 10;
      const smallFontSize = 8;

      // Título principal
      doc.fontSize(titleFontSize)
         .font(DOC_FONT.heading)
         .text(model.encabezado.toUpperCase(), { align: 'center' });
      
      // Información de cuantía y precisión
      doc.fontSize(smallFontSize)
         .font(DOC_FONT.body)
         .text(`Cuantía reclamada: ${cuantia.toLocaleString('es-ES')} €`, { align: 'center' });
      
      if (precision > 0) {
        doc.text(`Precisión OCR: ≈ ${precision}%`, { align: 'center' });
      }
      
      doc.moveDown(1);

      // Partes
      doc.fontSize(sectionFontSize)
         .font(DOC_FONT.heading)
         .text('PARTES', { underline: true });
      
      doc.fontSize(bodyFontSize)
         .font(DOC_FONT.body)
         .text(model.partes);
      
      doc.moveDown(1);

      // Hechos
      doc.fontSize(sectionFontSize)
         .font(DOC_FONT.heading)
         .text('HECHOS', { underline: true });
      
      doc.fontSize(bodyFontSize)
         .font(DOC_FONT.body);
      
      model.hechos.forEach((hecho, index) => {
        doc.text(`${index + 1}.- ${hecho}`);
        doc.moveDown(0.5);
      });
      
      doc.moveDown(1);

      // Fundamentos de Derecho
      doc.fontSize(sectionFontSize)
         .font(DOC_FONT.heading)
         .text('FUNDAMENTOS DE DERECHO', { underline: true });
      
      doc.fontSize(bodyFontSize)
         .font(DOC_FONT.body);

      // Competencia
      if (model.fundamentos.competencia.length > 0) {
        doc.font(DOC_FONT.heading).text('Competencia y Procedimiento:');
        doc.font(DOC_FONT.body);
        model.fundamentos.competencia.forEach(fundamento => {
          doc.text(`• ${fundamento}`);
        });
        doc.moveDown(0.5);
      }

      // Legitimación
      if (model.fundamentos.legitimacion.length > 0) {
        doc.font(DOC_FONT.heading).text('Legitimación:');
        doc.font(DOC_FONT.body);
        model.fundamentos.legitimacion.forEach(fundamento => {
          doc.text(`• ${fundamento}`);
        });
        doc.moveDown(0.5);
      }

      // Fondo
      if (model.fundamentos.fondo.length > 0) {
        doc.font(DOC_FONT.heading).text('Fondo del Asunto:');
        doc.font(DOC_FONT.body);
        model.fundamentos.fondo.forEach(fundamento => {
          doc.text(`• ${fundamento}`);
        });
        doc.moveDown(0.5);
      }

      // Intereses y Costas
      if (model.fundamentos.interesesYCostas.length > 0) {
        doc.font(DOC_FONT.heading).text('Intereses y Costas:');
        doc.font(DOC_FONT.body);
        model.fundamentos.interesesYCostas.forEach(fundamento => {
          doc.text(`• ${fundamento}`);
        });
        doc.moveDown(0.5);
      }

      doc.moveDown(1);

      // Súplica
      doc.fontSize(sectionFontSize)
         .font(DOC_FONT.heading)
         .text('SÚPLICA', { underline: true });
      
      doc.fontSize(bodyFontSize)
         .font(DOC_FONT.body);
      
      model.suplico.forEach((solicitud, index) => {
        doc.text(`${index + 1}.- ${solicitud}`);
        doc.moveDown(0.5);
      });
      
      doc.moveDown(1);

      // Otrosí
      if (model.otrosi.length > 0) {
        doc.fontSize(sectionFontSize)
           .font(DOC_FONT.heading)
           .text('OTROSÍ', { underline: true });
        
        doc.fontSize(bodyFontSize)
           .font(DOC_FONT.body);
        
        model.otrosi.forEach((otrosi, index) => {
          doc.text(`${index + 1}.- ${otrosi}`);
          doc.moveDown(0.5);
        });
        
        doc.moveDown(1);
      }

      // Documentos
      if (model.documentos.length > 0) {
        doc.fontSize(sectionFontSize)
           .font(DOC_FONT.heading)
           .text('DOCUMENTOS APORTADOS', { underline: true });
        
        doc.fontSize(bodyFontSize)
           .font(DOC_FONT.body);
        
        model.documentos.forEach((documento, index) => {
          doc.text(`${index + 1}.- ${documento}`);
        });
        
        doc.moveDown(1);
      }

      // Lugar y Fecha
      doc.fontSize(bodyFontSize)
         .font(DOC_FONT.body)
         .text(model.lugarFecha, { align: 'right' });
      
      doc.moveDown(2);

      // Notas Pro Se (si aplica)
      if (model.notasProSe.length > 0) {
        doc.fontSize(smallFontSize)
           .font(DOC_FONT.heading)
           .text('NOTAS PARA PRESENTACIÓN SIN ABOGADO:', { underline: true });
        
        doc.font(DOC_FONT.body);
        model.notasProSe.forEach((nota, index) => {
          doc.text(`• ${nota}`);
        });
        
        doc.moveDown(1);
      }

      // Citas legales
      if (model.citas.length > 0) {
        doc.fontSize(smallFontSize)
           .font(DOC_FONT.heading)
           .text('CITAS LEGALES:', { underline: true });
        
        doc.font(DOC_FONT.body);
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
