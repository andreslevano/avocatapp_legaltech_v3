import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export interface WordDocumentData {
  title: string;
  area: string;
  country: string;
  content: string;
  type: 'template' | 'sample' | 'study';
}

/**
 * Converts plain text content to Word document paragraphs
 */
function contentToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if it's a heading (starts with number or is short and uppercase)
    const isHeading = /^\d+\.\s+[A-Z]/.test(trimmedLine) || 
                     (trimmedLine.length < 100 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5);
    
    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );
    } else if (trimmedLine.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 22, // 11pt
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }
  
  return paragraphs;
}

/**
 * Generates a Word document (.docx) from content
 */
export async function renderWordDocument(data: WordDocumentData): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: data.type === 'template' ? 'PLANTILLA' : data.type === 'sample' ? 'EJEMPLO' : 'MATERIAL DE ESTUDIO',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Title
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          
          // Area and Country
          new Paragraph({
            children: [
              new TextRun({
                text: `Área: ${data.area}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Jurisdicción: ${data.country}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: `Generado el: ${new Date().toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}`,
                size: 18,
                italics: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
          }),
          
          // Content
          ...contentToParagraphs(data.content),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


