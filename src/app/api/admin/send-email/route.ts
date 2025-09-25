import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userEmail, pdfUrl, subject, userName } = body;

    if (!userEmail || !pdfUrl) {
      return NextResponse.json(
        { success: false, error: 'Email del usuario y URL del PDF requeridos' },
        { status: 400 }
      );
    }

    console.log(`📧 Enviando email de fidelización a ${userEmail}`, {
      requestId,
      subject: subject || 'Actualización de tu cuenta'
    });

    // Simular envío de email (en producción usarías SendGrid, AWS SES, etc.)
    const emailResult = await sendEmail({
      to: userEmail,
      subject: subject || `Actualización de tu cuenta - ${userName || 'Cliente'}`,
      pdfUrl: pdfUrl,
      userName: userName || 'Cliente'
    });

    // Guardar registro del envío en Firestore
    await saveEmailSentRecord(userEmail, pdfUrl, subject, emailResult);

    const elapsedMs = Date.now() - startTime;
    console.log(`✅ Email enviado exitosamente a ${userEmail}`, { 
      requestId,
      elapsedMs 
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Email enviado exitosamente',
        userEmail,
        sentAt: new Date().toISOString(),
        emailId: emailResult.emailId
      }
    });

  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ Error enviando email:`, { 
      requestId,
      error: error.message, 
      elapsedMs 
    });
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function sendEmail({ to, subject, pdfUrl, userName }: {
  to: string;
  subject: string;
  pdfUrl: string;
  userName: string;
}) {
  // Simular envío de email
  // En producción, aquí integrarías con SendGrid, AWS SES, Nodemailer, etc.
  
  console.log(`📧 Enviando email a ${to}`);
  console.log(`📋 Asunto: ${subject}`);
  console.log(`🔗 PDF URL: ${pdfUrl}`);
  
  // Simular delay de envío
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    emailId: uuidv4(),
    status: 'sent',
    sentAt: new Date().toISOString(),
    provider: 'mock', // En producción sería 'sendgrid', 'ses', etc.
    messageId: `msg_${Date.now()}`
  };
}

async function saveEmailSentRecord(userEmail: string, pdfUrl: string, subject: string, emailResult: any) {
  const { db } = await import('@/lib/firebase-admin');
  
  const sentRecord = {
    emailId: emailResult.emailId,
    userEmail: userEmail,
    subject: subject,
    pdfUrl: pdfUrl,
    sentAt: emailResult.sentAt,
    status: emailResult.status,
    provider: emailResult.provider,
    messageId: emailResult.messageId,
    metadata: {
      type: 'loyalty_email',
      generatedBy: 'admin',
      version: '1.0'
    }
  };

  await db().collection('email_sends').add(sentRecord);
  console.log(`📧 Email send record saved for ${userEmail}`);
}

