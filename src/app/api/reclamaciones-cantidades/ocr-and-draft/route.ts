import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { extractTextFromPDF, extractInvoiceInfo } from '@/lib/pdf-ocr';
import { buildPromptReclamacion } from '@/lib/prompts/reclamacion-cantidades-maestro';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/reclamaciones-cantidades/ocr-and-draft
 * Procesa OCR de PDFs y genera borrador con OpenAI
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
    const inputFiles = caseData.storage?.inputFiles || [];

    if (inputFiles.length === 0) {
      return NextResponse.json(
        { error: 'No hay archivos para procesar' },
        { status: 400 }
      );
    }

    console.log(`🚀 Iniciando OCR y generación de borrador para caso ${caseId}`);
    console.log(`📄 Archivos a procesar: ${inputFiles.length}`);

    // Paso 1: Procesar OCR de todos los PDFs
    let rawTextConsolidado = '';
    const extractedData: any = {
      fechas: [],
      importes: [],
      empresas: [],
      tipoContrato: undefined,
      deudor: undefined,
      cantidadTotal: 0,
    };

    for (const file of inputFiles) {
      try {
        console.log(`📖 Procesando OCR de: ${file.fileName}`);

        // Descargar PDF desde Storage
        const storageRef = ref(storage as any, file.path);
        const downloadURL = await getDownloadURL(storageRef);

        // Descargar el archivo
        const response = await fetch(downloadURL);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extraer texto con OCR
        const textoExtraido = await extractTextFromPDF(buffer);
        rawTextConsolidado += `\n\n--- ${file.fileName} ---\n\n${textoExtraido}`;

        // Extraer información estructurada
        const infoFactura = extractInvoiceInfo(textoExtraido);
        
        if (infoFactura.amounts.length > 0) {
          extractedData.importes.push(...infoFactura.amounts);
          extractedData.cantidadTotal = Math.max(
            extractedData.cantidadTotal,
            ...infoFactura.amounts
          );
        }

        if (infoFactura.dates.length > 0) {
          extractedData.fechas.push(...infoFactura.dates);
        }

        if (infoFactura.debtorName) {
          extractedData.deudor = infoFactura.debtorName;
        }

        // Intentar identificar empresa
        const empresaMatch = textoExtraido.match(/(?:empresa|sociedad|s\.?l\.?|s\.?a\.?)[\s:]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i);
        if (empresaMatch) {
          extractedData.empresas.push(empresaMatch[1].trim());
        }

        console.log(`✅ OCR completado para ${file.fileName}`);
      } catch (error) {
        console.error(`❌ Error procesando ${file.fileName}:`, error);
        // Continuar con los demás archivos
      }
    }

    // Limpiar duplicados
    extractedData.fechas = [...new Set(extractedData.fechas)];
    extractedData.importes = [...new Set(extractedData.importes)];
    extractedData.empresas = [...new Set(extractedData.empresas)];

    // Crear resumen del OCR (primeros 2000 caracteres)
    const ocrSummary = rawTextConsolidado.substring(0, 2000) + 
      (rawTextConsolidado.length > 2000 ? '...' : '');

    // Actualizar Firestore con OCR
    await updateDoc(caseRef, {
      ocr: {
        rawText: rawTextConsolidado,
        extracted: extractedData,
      },
      updatedAt: serverTimestamp(),
    });

    console.log('✅ OCR guardado en Firestore');

    // Paso 2: Generar borrador con OpenAI
    console.log('🤖 Generando borrador con OpenAI...');

    const prompt = buildPromptReclamacion({
      formData: caseData.formData || {},
      ocrExtracted: extractedData,
      ocrSummary,
      modo: 'draft',
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un abogado experto español especializado en reclamaciones de cantidades. Generas documentos legales profesionales, precisos y completos según la legislación española vigente.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.3,
    });

    const borrador = completion.choices[0]?.message?.content || 'Error al generar el borrador';

    // Guardar borrador en Firestore
    const draftHistoryEntry = {
      createdAt: new Date().toISOString(),
      prompt,
      response: borrador,
    };

    const currentHistory = caseData.drafting?.history || [];
    const updatedHistory = [...currentHistory, draftHistoryEntry];

    await updateDoc(caseRef, {
      drafting: {
        lastPrompt: prompt,
        lastResponse: borrador,
        lastResponseFormat: 'plain',
        history: updatedHistory,
      },
      status: 'draft',
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Borrador guardado en Firestore');

    return NextResponse.json({
      success: true,
      ocr: {
        rawText: rawTextConsolidado.substring(0, 500) + '...', // Solo primeros 500 chars en respuesta
        extracted: extractedData,
      },
      draft: {
        content: borrador,
        tokensUsed: completion.usage?.total_tokens,
      },
    });
  } catch (error: any) {
    console.error('❌ Error en OCR y generación de borrador:', error);
    return NextResponse.json(
      { error: 'Error al procesar OCR y generar borrador', details: error.message },
      { status: 500 }
    );
  }
}

