import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
) {
  try {
    const { emailId } = params;

    console.log(`📧 Obteniendo email específico: ${emailId}`);

    const emailDoc = await db().collection('generated_emails').doc(emailId).get();

    if (!emailDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email no encontrado'
        },
        { status: 404 }
      );
    }

    const emailData = {
      id: emailDoc.id,
      ...emailDoc.data()
    };

    console.log(`✅ Email encontrado: ${emailId}`);

    return NextResponse.json({
      success: true,
      data: emailData
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


