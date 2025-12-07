import PDFDocument from './pdfkit';
import { applyPdfFonts, PDF_FONT_FAMILY, PDF_FONT_PATHS } from './fonts';

export interface StudyMaterialData {
  title: string;
  area: string;
  country: string;
  content: string;
}

export function renderStudyMaterialPDF(data: StudyMaterialData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Use default Helvetica font (works everywhere)
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Helper function to safely set font (always use Helvetica)
      const setFont = (fontName: string, size: number) => {
        if (fontName.includes('Bold') || fontName === PDF_FONT_FAMILY.bold) {
          doc.fontSize(size).font('Helvetica-Bold');
        } else {
          doc.fontSize(size).font('Helvetica');
        }
      };

      // Header
      setFont(PDF_FONT_FAMILY.bold, 16);
      doc.text('MATERIAL DE ESTUDIO', { align: 'center' });
      
      doc.moveDown(1);

      // Title
      setFont(PDF_FONT_FAMILY.bold, 14);
      doc.text(data.title, { align: 'center' });
      
      doc.moveDown(1);

      // Area and Country
      setFont(PDF_FONT_FAMILY.regular, 10);
      doc.text(`Área: ${data.area}`, { align: 'center' });
      
      setFont(PDF_FONT_FAMILY.regular, 10);
      doc.text(`Jurisdicción: ${data.country}`, { align: 'center' });
      
      doc.moveDown(2);

      // Date
      const date = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setFont(PDF_FONT_FAMILY.regular, 9);
      doc.text(`Generado el: ${date}`, { align: 'right' });
      
      doc.moveDown(2);

      // Content
      setFont(PDF_FONT_FAMILY.regular, 11);
      
      // Split content into paragraphs and render
      const paragraphs = data.content.split('\n\n').filter(p => p.trim());
      
      paragraphs.forEach((paragraph, index) => {
        // Check if it's a heading (starts with number or is short and bold-like)
        const isHeading = /^\d+\.\s+[A-Z]/.test(paragraph) || 
                         (paragraph.length < 100 && paragraph.split('\n').length === 1);
        
        if (isHeading) {
          doc.font('Helvetica-Bold').fontSize(12);
        } else {
          doc.font('Helvetica').fontSize(11);
        }
        
        // Clean up the paragraph
        const cleanParagraph = paragraph.trim().replace(/\n/g, ' ');
        
        doc.text(cleanParagraph, {
          align: 'left',
          indent: isHeading ? 0 : 10
        });
        
        doc.moveDown(1);
      });

      // Footer - add after content is written
      doc.on('pageAdded', () => {
        const pageCount = doc.bufferedPageRange();
        const currentPage = pageCount.count;
        doc.switchToPage(currentPage - 1); // pages are 0-indexed
        doc.fontSize(8).font('Helvetica');
        doc.text(
          `Página ${currentPage} de ${currentPage}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

