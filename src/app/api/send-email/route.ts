import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import jsPDF from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, documentTitle, documentContent, userName } = await request.json();

    if (!userEmail || !documentTitle || !documentContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Word document
    const wordDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: documentTitle,
            heading: HeadingLevel.TITLE,
            alignment: 'center',
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: documentContent,
                size: 24, // 12pt
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '\n\n_________________________',
                size: 24,
              }),
            ],
            alignment: 'right',
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Firma',
                size: 24,
              }),
            ],
            alignment: 'right',
          }),
        ],
      }],
    });

    // Generate Word document buffer
    const wordBuffer = await Packer.toBuffer(wordDoc);

    // Create PDF document
    const pdfDoc = new jsPDF();
    pdfDoc.setFont('helvetica');
    
    // Title
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text(documentTitle, 105, 20, { align: 'center' });
    
    // Add line under title
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(20, 25, 190, 25);
    
    // Content
    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'normal');
    
    // Split content into lines and add to PDF
    const contentLines = documentContent.split('\n');
    let yPosition = 35;
    const lineHeight = 6;
    const maxWidth = 170;
    const leftMargin = 20;
    
    contentLines.forEach((line: string) => {
      if (line.trim() === '') {
        yPosition += lineHeight;
        return;
      }
      
      // Handle long lines by wrapping them
      const wrappedLines = pdfDoc.splitTextToSize(line, maxWidth);
      wrappedLines.forEach((wrappedLine: string) => {
        if (yPosition > 280) { // Start new page if needed
          pdfDoc.addPage();
          yPosition = 20;
        }
        pdfDoc.text(wrappedLine, leftMargin, yPosition);
        yPosition += lineHeight;
      });
    });
    
    // Add signature section
    yPosition += 20;
    if (yPosition > 280) {
      pdfDoc.addPage();
      yPosition = 20;
    }
    
    pdfDoc.text('_________________________', 150, yPosition);
    yPosition += lineHeight;
    pdfDoc.text('Firma', 150, yPosition);
    
    // Generate PDF buffer
    const pdfBuffer = pdfDoc.output('arraybuffer');

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to your preferred email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Email content
    const emailSubject = `Tu Reclamación de Cantidades - ${documentTitle}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Avocat LegalTech</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">¡Tu Reclamación de Cantidades está lista!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            Hola ${userName || 'Estimado/a cliente'},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            Tu reclamación de cantidades ha sido generada exitosamente y está lista para su uso. 
            En este email encontrarás dos versiones del documento:
          </p>
          
          <ul style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            <li><strong>Documento en Word (.docx):</strong> Para edición y personalización</li>
            <li><strong>Documento en PDF (.pdf):</strong> Para impresión y envío oficial</li>
          </ul>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">Próximos pasos recomendados:</h3>
            <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
              <li>Revisa el documento generado</li>
              <li>Personaliza el contenido según tus necesidades</li>
              <li>Envía la reclamación por correo certificado</li>
              <li>Guarda una copia para tus registros</li>
            </ol>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            Si tienes alguna pregunta o necesitas asistencia adicional, no dudes en contactarnos.
          </p>
          
          <p style="color: #6b7280; line-height: 1.6;">
            Atentamente,<br>
            <strong>Equipo Avocat LegalTech</strong>
          </p>
        </div>
        
        <div style="background-color: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 Avocat LegalTech. Todos los derechos reservados.</p>
          <p style="margin: 5px 0 0 0;">Este es un email automático, por favor no responder.</p>
        </div>
      </div>
    `;

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `${documentTitle}.docx`,
          content: wordBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          filename: `${documentTitle}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully with attachments',
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
