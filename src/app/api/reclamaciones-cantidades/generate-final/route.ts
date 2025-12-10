import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { buildPromptReclamacion } from '@/lib/prompts/reclamacion-cantidades-maestro';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/reclamaciones-cantidades/generate-final
 * Genera el escrito final después del pago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, uid } = body;

    if (!caseId || !uid) {
      return NextResponse.json(
        { error: 'caseId y uid son requeridos' },
        { status: 400 }
      );
    }

    // Obtener caso de Firestore
    const caseRef = doc(db as any, 'users', uid, 'reclamaciones_cantidades', caseId);
    const caseDoc = await getDoc(caseRef);

    if (!caseDoc.exists()) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    const caseData = caseDoc.data();

    // Validar que tiene datos necesarios
    if (!caseData.ocr || !caseData.formData) {
      return NextResponse.json(
        { error: 'El caso debe tener OCR y formData completos' },
        { status: 400 }
      );
    }

    console.log(`🚀 Generando escrito final para caso ${caseId}`);

    // Actualizar estado
    await updateDoc(caseRef, {
      status: 'paid',
      updatedAt: serverTimestamp(),
    });

    // Construir prompt final (más completo que el borrador)
    const prompt = buildPromptReclamacion({
      formData: caseData.formData,
      ocrExtracted: caseData.ocr.extracted,
      ocrSummary: caseData.ocr.rawText.substring(0, 2000),
      modo: 'final',
    });

    // Generar escrito final con OpenAI
    console.log('🤖 Generando escrito final con OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un abogado experto español especializado en reclamaciones de cantidades. Generas documentos legales profesionales, precisos y completos según la legislación española vigente. Este es el escrito FINAL que se presentará ante el juzgado.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000, // Más tokens para el escrito final
      temperature: 0.2, // Más bajo para mayor precisión
    });

    const escritoFinal = completion.choices[0]?.message?.content || 'Error al generar el escrito final';

    console.log('✅ Escrito final generado');

    // Generar PDF
    console.log('📄 Generando PDF...');
    const { default: jsPDF } = await import('jspdf');
    const pdfDoc = new jsPDF();
    
    // Configuración
    pdfDoc.setFont('helvetica');
    pdfDoc.setFontSize(12);
    
    // Título
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('RECLAMACIÓN DE CANTIDADES', 105, 20, { align: 'center' });
    
    // Línea separadora
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(20, 25, 190, 25);
    
    // Contenido
    pdfDoc.setFontSize(11);
    pdfDoc.setFont('helvetica', 'normal');
    
    const lines = escritoFinal.split('\n');
    let yPosition = 35;
    const lineHeight = 6;
    const maxWidth = 170;
    const leftMargin = 20;
    const pageHeight = 280;

    for (const line of lines) {
      if (line.trim() === '') {
        yPosition += lineHeight / 2;
        continue;
      }

      // Nueva página si es necesario
      if (yPosition > pageHeight) {
        pdfDoc.addPage();
        yPosition = 20;
      }

      // Dividir líneas largas
      const wrappedLines = pdfDoc.splitTextToSize(line, maxWidth);
      wrappedLines.forEach((wrappedLine: string) => {
        if (yPosition > pageHeight) {
          pdfDoc.addPage();
          yPosition = 20;
        }
        pdfDoc.text(wrappedLine, leftMargin, yPosition);
        yPosition += lineHeight;
      });
    }

    // Convertir a buffer
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));

    // Guardar PDF en Storage
    const storagePath = `reclamaciones_cantidades/${uid}/${caseId}/output/final.pdf`;
    const storageRef = ref(storage as any, storagePath);
    
    await uploadBytes(storageRef, pdfBuffer, {
      contentType: 'application/pdf',
      customMetadata: {
        caseId,
        generatedAt: new Date().toISOString(),
        type: 'final',
      },
    });

    const downloadURL = await getDownloadURL(storageRef);

    console.log(`✅ PDF guardado en Storage: ${storagePath}`);

    // Actualizar Firestore
    await updateDoc(caseRef, {
      'storage.finalPdf': {
        path: storagePath,
        url: downloadURL,
        generatedAt: new Date().toISOString(),
      },
      'payment.paidAt': new Date().toISOString(),
      'payment.status': 'paid',
      status: 'paid',
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Caso actualizado en Firestore');

    return NextResponse.json({
      success: true,
      pdf: {
        path: storagePath,
        url: downloadURL,
      },
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error: any) {
    console.error('❌ Error generando escrito final:', error);
    return NextResponse.json(
      { error: 'Error al generar escrito final', details: error.message },
      { status: 500 }
    );
  }
}

