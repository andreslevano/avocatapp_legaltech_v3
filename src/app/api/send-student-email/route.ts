import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { GoogleChatNotifications } from '@/lib/google-chat';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const body = await request.json();
    const { to, subject, documentName, areaLegal, filename, downloadUrl, userId, docId } = body;
    
    if (!to || !subject || !documentName) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Generar contenido del email
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento Legal Generado</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .download-btn { 
            display: inline-block; 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold;
            margin: 20px 0;
        }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Documento Legal Generado</h1>
            <p>Tu documento ha sido creado exitosamente con IA</p>
        </div>
        
        <div class="content">
            <h2>¡Hola!</h2>
            <p>Te informamos que tu documento legal ha sido generado exitosamente utilizando inteligencia artificial.</p>
            
            <div class="document-info">
                <h3>📋 Información del Documento</h3>
                <p><strong>Nombre:</strong> <span class="highlight">${documentName}</span></p>
                <p><strong>Área Legal:</strong> ${areaLegal}</p>
                <p><strong>Archivo:</strong> ${filename}</p>
                <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${downloadUrl}" class="download-btn">
                    📥 Descargar Documento PDF
                </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>🔒 Información de Seguridad</h4>
                <p>• Este enlace de descarga expira en 15 minutos</p>
                <p>• El documento se ha guardado en tu perfil de usuario</p>
                <p>• Puedes acceder a él desde tu dashboard en cualquier momento</p>
            </div>
            
            <div style="background: #f3e5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>🤖 Generado con IA</h4>
                <p>Este documento fue creado utilizando ChatGPT-4o, garantizando:</p>
                <p>• Precisión legal y técnica</p>
                <p>• Cumplimiento normativo</p>
                <p>• Estructura profesional</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Este email fue generado automáticamente por Avocat LegalTech</p>
            <p>ID de Documento: ${docId} | Usuario: ${userId}</p>
        </div>
    </div>
</body>
</html>
    `;
    
    // Configurar transporter de Nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER || 'sergio.pena@madcloudconsulting.com',
        pass: process.env.EMAIL_PASS || 'your-app-password' // Usar App Password de Gmail
      }
    });
    
    // Enviar email real
    const mailOptions = {
      from: `"Avocat LegalTech" <${process.env.EMAIL_USER || 'sergio.pena@madcloudconsulting.com'}>`,
      to: to,
      subject: subject,
      html: emailContent
    };
    
    console.log(`📧 Enviando email real a ${to}:`);
    console.log(`   Asunto: ${subject}`);
    console.log(`   Documento: ${documentName}`);
    console.log(`   URL: ${downloadUrl}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente:', info.messageId);
    
    // Notificar a Google Chat sobre el envío exitoso (no bloqueante)
    GoogleChatNotifications.sendNotification(
      `📧 Email Enviado\n\n` +
      `Para: ${to}\n` +
      `Asunto: ${subject}\n` +
      `Documento: ${documentName}\n` +
      `Estado: Enviado`
    ).catch((err) => {
      console.warn('⚠️ Error enviando notificación a Google Chat:', err);
    });
    
    // Guardar registro del email en Firestore (simulado)
    const emailRecord = {
      id: requestId,
      to: to,
      subject: subject,
      documentName: documentName,
      areaLegal: areaLegal,
      filename: filename,
      downloadUrl: downloadUrl,
      userId: userId,
      docId: docId,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    
    console.log('📝 Registro de email guardado:', emailRecord);
    
    return NextResponse.json({
      success: true,
      data: {
        emailId: requestId,
        messageId: info.messageId,
        to: to,
        subject: subject,
        sentAt: new Date().toISOString(),
        status: 'sent'
      }
    });
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    // Notificar error a Google Chat (no bloqueante)
    // Las variables pueden no estar disponibles en el catch, usar valores seguros
    const errorTo = (error as any)?.to || 'N/A';
    const errorSubject = (error as any)?.subject || 'N/A';
    const errorDocName = (error as any)?.documentName || 'N/A';
    
    GoogleChatNotifications.sendNotification(
      `❌ Error Enviando Email\n\n` +
      `Para: ${errorTo}\n` +
      `Asunto: ${errorSubject}\n` +
      `Documento: ${errorDocName}\n` +
      `Estado: Fallido\n` +
      `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    ).catch((err) => {
      console.warn('⚠️ Error enviando notificación de error a Google Chat:', err);
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
