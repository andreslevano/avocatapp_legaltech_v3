import {
  AlignmentType, BorderStyle, Document, Header, HeadingLevel, ImageRun, Packer, Paragraph, TabStopType, TextRun,
} from 'docx';
import type { ServerBranding } from '../branding-server';

const hex = (c: string) => c.replace('#', '').toUpperCase();
/** docx font name: first family of the stack (Word substitutes when it isn't installed). */
const wordFont = (css: string) => css.split(',')[0].trim().replace(/^'|'$/g, '');

/** Page header like the HTML documents: logo, company / NIF, date, 1.5pt rule in the primary colour. */
function brandedHeader(sb: ServerBranding): Header {
  const b = sb.branding;
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const logo = sb.logo && b.logo && /^image\/(png|jpeg)$/.test(sb.logo.mime)
    ? new ImageRun({ type: sb.logo.mime === 'image/png' ? 'png' : 'jpg', data: sb.logo.bytes,
      transformation: { width: b.logo.width, height: b.logo.height } })
    : null;
  if (sb.logo && !logo) console.warn(`[docx] logo type ${sb.logo.mime} not supported — header without logo`);
  const right = b.logo?.position === 'right';
  const rule = { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(b.primary), space: 4 } }; // 12 eighths = 1.5pt
  const name = new TextRun({ text: b.header.authorName.toUpperCase(), bold: true, size: 18, color: hex(b.primary) });
  const nif = b.header.authorNif ? new TextRun({ text: b.header.authorNif, size: 16, color: hex(b.secondary), break: 1 }) : null;
  const dateRun = new TextRun({ text: `\t${date}`, size: 18, color: hex(b.secondary) });
  const children = [
    ...(logo && !right ? [logo, new TextRun({ text: '  ' })] : []),
    name, ...(nif ? [nif] : []), dateRun,
    ...(logo && right ? [new TextRun({ text: '  ' }), logo] : []),
  ];
  return new Header({ children: [new Paragraph({ children, border: rule, tabStops: [{ type: TabStopType.RIGHT, position: 9000 }] })] });
}

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
export async function renderWordDocument(data: WordDocumentData, branding?: ServerBranding | null): Promise<Buffer> {
  const sb = branding && !branding.branding.isDefault ? branding : null;
  const doc = new Document({
    ...(sb ? { styles: { default: {
      document: { run: { font: wordFont(sb.branding.font.css) } },
      ...(sb.branding.headingColor ? {
        heading1: { run: { color: hex(sb.branding.headingColor) } },
        heading2: { run: { color: hex(sb.branding.headingColor) } },
      } : {}),
    } } } : {}),
    sections: [
      {
        properties: {},
        ...(sb ? { headers: { default: brandedHeader(sb) } } : {}),
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




