import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { extractTextFromPDF, extractInvoiceInfo } from '@/lib/pdf-ocr';
import { buildReclamacionPrompt } from '@/lib/prompts/reclamacion-cantidades-es';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      documents, // Array de { id, name, category, storagePath, downloadURL }
      metadata 
    } = body;

    if (!userId || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: userId y documents' },
        { status: 400 }
      );
    }

    console.log('🚀 Iniciando generación de reclamación de cantidades');
    console.log(`📄 Documentos a procesar: ${documents.length}`);

    // Paso 1: Extraer texto de todos los PDFs usando OCR
    const documentosProcesados = [];
    let cantidadTotal = 0;
    let deudor: string | undefined;
    const fechas: string[] = [];

    for (const doc of documents) {
      try {
        console.log(`📖 Procesando OCR de: ${doc.name}`);
        
        // Descargar PDF desde Storage
        const storageRef = ref(storage as any, doc.storagePath);
        const downloadURL = doc.downloadURL || await getDownloadURL(storageRef);
        
        // Descargar el archivo
        const response = await fetch(downloadURL);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Extraer texto con OCR
        const textoExtraido = await extractTextFromPDF(buffer);
        console.log(`✅ Texto extraído (${textoExtraido.length} caracteres)`);
        
        // Extraer información específica si es una factura
        let infoFactura = null;
        if (doc.category === 'invoice' || doc.name.toLowerCase().includes('factura')) {
          infoFactura = extractInvoiceInfo(textoExtraido);
          console.log(`💰 Información extraída:`, infoFactura);
          
          if (infoFactura.totalAmount) {
            cantidadTotal = Math.max(cantidadTotal, infoFactura.totalAmount);
          }
          if (infoFactura.debtorName) {
            deudor = infoFactura.debtorName;
          }
          if (infoFactura.dates.length > 0) {
            fechas.push(...infoFactura.dates);
          }
        }
        
        documentosProcesados.push({
          nombre: doc.name,
          categoria: doc.category,
          textoExtraido: textoExtraido.substring(0, 2000), // Limitar para no exceder tokens
          infoFactura,
        });
      } catch (error) {
        console.error(`❌ Error procesando ${doc.name}:`, error);
        // Continuar con los demás documentos aunque uno falle
        documentosProcesados.push({
          nombre: doc.name,
          categoria: doc.category,
          textoExtraido: '[Error al extraer texto]',
        });
      }
    }

    // Paso 2: Construir prompt con los datos extraídos
    const prompt = buildReclamacionPrompt({
      documentos: documentosProcesados,
      cantidadReclamada: cantidadTotal > 0 ? cantidadTotal : metadata?.amount,
      deudor: deudor || metadata?.debtor,
      fechas: fechas.length > 0 ? fechas : undefined,
      detallesAdicionales: metadata?.additionalDetails,
    });

    console.log('🤖 Enviando prompt a OpenAI...');

    // Paso 3: Generar documento con OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un abogado experto español especializado en derecho civil y mercantil. Generas documentos legales profesionales, precisos y completos según la legislación española vigente.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.3, // Baja temperatura para documentos más precisos y formales
    });

    const documentoGenerado = completion.choices[0]?.message?.content || 'Error al generar el documento';

    console.log('✅ Documento generado exitosamente');

    // Paso 4: Guardar en Firestore (opcional, para tracking)
    const documentId = `recl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (db && (typeof db === 'object' && Object.keys(db).length > 0)) {
      try {
        const reclRef = doc(collection(db as any, 'reclamaciones'), documentId);
        await setDoc(reclRef, {
          userId,
          status: 'completed',
          documentos: documentosProcesados.map(d => ({
            nombre: d.nombre,
            categoria: d.categoria,
            textoExtraido: d.textoExtraido?.substring(0, 500), // Limitar para Firestore
            infoFactura: d.infoFactura,
          })),
          documentoGenerado: {
            title: `Reclamación de Cantidades - ${new Date().toLocaleDateString('es-ES')}`,
            content: documentoGenerado.substring(0, 100000), // Límite de Firestore
          },
          metadata: {
            cantidadReclamada: cantidadTotal > 0 ? cantidadTotal : metadata?.amount,
            deudor,
            fechas: fechas.length > 0 ? fechas : undefined,
            documentosProcesados: documentosProcesados.length,
            tokensUsados: completion.usage?.total_tokens,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log('✅ Reclamación guardada en Firestore:', documentId);
      } catch (firestoreError) {
        console.warn('⚠️ Error guardando en Firestore (continuando):', firestoreError);
        // No fallar si Firestore falla
      }
    }

    // Paso 5: Retornar el documento generado
    return NextResponse.json({
      success: true,
      documentId,
      document: {
        title: `Reclamación de Cantidades - ${new Date().toLocaleDateString('es-ES')}`,
        content: documentoGenerado,
        metadata: {
          cantidadReclamada: cantidadTotal > 0 ? cantidadTotal : metadata?.amount,
          deudor,
          fechas: fechas.length > 0 ? fechas : undefined,
          documentosProcesados: documentosProcesados.length,
          tokensUsados: completion.usage?.total_tokens,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error generando reclamación:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar la reclamación',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

