import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { storage } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

interface AnalyzePDFRequest {
  uid: string;
  docId: string;
  prompt: string;
  analysisType?: 'legal' | 'risk' | 'summary' | 'recommendations';
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const body: AnalyzePDFRequest = await request.json();
    const { uid, docId, prompt, analysisType = 'legal' } = body;

    // Validar parámetros requeridos
    if (!uid || !docId || !prompt) {
      return NextResponse.json(
        { success: false, error: 'uid, docId y prompt son requeridos' },
        { status: 400 }
      );
    }

    console.log('Iniciando análisis de PDF', {
      uid,
      docId,
      analysisType,
      promptLength: prompt.length
    });

    // 1. Descargar PDF de Firebase Storage
    const pdfBuffer = await downloadPDFFromStorage(uid, docId);
    
    // 2. Analizar con GPT-5
    const analysisResult = await analyzeWithGPT5(prompt, pdfBuffer, analysisType);
    
    // 3. Guardar resultado en Firestore
    await saveAnalysisToFirestore(uid, docId, analysisResult, analysisType);
    
    const elapsedMs = Date.now() - startTime;
    console.log('Análisis completado', {
      uid,
      docId,
      analysisType,
      elapsedMs,
      tokensUsed: analysisResult.usage.totalTokens
    });

    return NextResponse.json({
      success: true,
      data: {
        analysisId: analysisResult.analysisId,
        content: analysisResult.content,
        summary: analysisResult.summary,
        risks: analysisResult.risks,
        recommendations: analysisResult.recommendations,
        metadata: {
          model: analysisResult.model,
          tokensUsed: analysisResult.usage.totalTokens,
          processingTime: elapsedMs,
          analysisType
        }
      }
    });

  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, 'Error en análisis de PDF', {
      error: error.message,
      elapsedMs
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        hint: 'Verifica que el documento existe y que OpenAI está configurado correctamente'
      },
      { status: 500 }
    );
  }
}

/**
 * Descarga PDF de Firebase Storage
 */
async function downloadPDFFromStorage(uid: string, docId: string): Promise<Buffer> {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET!;
    const filePath = `users/${uid}/documents/${docId}.pdf`;
    
    console.log(`📥 Descargando PDF: ${filePath}`);
    
    const file = storage().bucket(bucketName).file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error(`PDF no encontrado: ${filePath}`);
    }

    const [buffer] = await file.download();
    console.log(`✅ PDF descargado: ${buffer.length} bytes`);
    
    return buffer;
  } catch (error: any) {
    console.error('❌ Error descargando PDF:', error);
    throw new Error(`Error descargando PDF: ${error.message}`);
  }
}

/**
 * Analiza PDF con GPT-5
 */
async function analyzeWithGPT5(
  prompt: string, 
  pdfBuffer: Buffer, 
  analysisType: string
): Promise<any> {
  try {
    const openaiClient = getOpenAIClient();
    
    // Personalizar prompt según tipo de análisis
    const systemPrompt = getSystemPromptForAnalysis(analysisType);
    const enhancedPrompt = enhancePromptForAnalysis(prompt, analysisType);
    
    const result = await openaiClient.analyzeDocument(
      enhancedPrompt,
      pdfBuffer,
      {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4000
      }
    );

    // Parsear respuesta estructurada
    const parsedAnalysis = parseAnalysisResponse(result.content, analysisType);
    
    return {
      analysisId: uuidv4(),
      content: result.content,
      summary: parsedAnalysis.summary,
      risks: parsedAnalysis.risks,
      recommendations: parsedAnalysis.recommendations,
      model: result.model,
      usage: result.usage,
      finishReason: result.finishReason
    };

  } catch (error: any) {
    console.error('❌ Error en análisis GPT-5:', error);
    throw new Error(`Error en análisis: ${error.message}`);
  }
}

/**
 * Guarda análisis en Firestore
 */
async function saveAnalysisToFirestore(
  uid: string, 
  docId: string, 
  analysisResult: any,
  analysisType: string
): Promise<void> {
  try {
    const analysisData = {
      analysisId: analysisResult.analysisId,
      docId: docId,
      userId: uid,
      analysisType: analysisType,
      content: analysisResult.content,
      summary: analysisResult.summary,
      risks: analysisResult.risks,
      recommendations: analysisResult.recommendations,
      metadata: {
        model: analysisResult.model,
        tokensUsed: analysisResult.usage.totalTokens,
        finishReason: analysisResult.finishReason,
        createdAt: new Date().toISOString()
      }
    };

    // Guardar en subcolección del documento
    await db()
      .collection('users')
      .doc(uid)
      .collection('documents')
      .doc(docId)
      .collection('analysis')
      .add(analysisData);

    // También guardar en colección global de análisis
    await db()
      .collection('document_analysis')
      .add(analysisData);

    console.log(`💾 Análisis guardado en Firestore: ${analysisResult.analysisId}`);
  } catch (error: any) {
    console.error('❌ Error guardando análisis:', error);
    throw new Error(`Error guardando análisis: ${error.message}`);
  }
}

/**
 * Obtiene system prompt según tipo de análisis
 */
function getSystemPromptForAnalysis(analysisType: string): string {
  const prompts = {
    legal: `Eres un abogado experto especializado en análisis de documentos legales. 
    Analiza el documento proporcionado y proporciona un análisis legal detallado incluyendo:
    - Resumen ejecutivo del documento
    - Identificación de riesgos legales
    - Recomendaciones específicas
    - Aspectos técnicos relevantes
    Responde en español con formato estructurado.`,

    risk: `Eres un analista de riesgos legales especializado. 
    Identifica y evalúa todos los riesgos potenciales en el documento:
    - Riesgos contractuales
    - Riesgos procesales
    - Riesgos de cumplimiento
    - Riesgos financieros
    Proporciona un análisis detallado con niveles de riesgo (Alto, Medio, Bajo).`,

    summary: `Eres un especialista en resúmenes ejecutivos de documentos legales.
    Crea un resumen claro y conciso del documento que incluya:
    - Puntos clave del documento
    - Objetivos principales
    - Partes involucradas
    - Plazos importantes
    - Conclusiones principales`,

    recommendations: `Eres un consultor legal especializado en recomendaciones estratégicas.
    Proporciona recomendaciones específicas y accionables basadas en el documento:
    - Acciones inmediatas recomendadas
    - Estrategias a largo plazo
    - Mejoras sugeridas
    - Consideraciones adicionales`
  };

  return prompts[analysisType as keyof typeof prompts] || prompts.legal;
}

/**
 * Mejora el prompt según tipo de análisis
 */
function enhancePromptForAnalysis(prompt: string, analysisType: string): string {
  const enhancements = {
    legal: `Análisis Legal Detallado:\n\n${prompt}\n\nPor favor, proporciona un análisis legal completo del documento.`,
    risk: `Análisis de Riesgos:\n\n${prompt}\n\nIdentifica todos los riesgos potenciales y evalúa su nivel de impacto.`,
    summary: `Resumen Ejecutivo:\n\n${prompt}\n\nCrea un resumen claro y estructurado del documento.`,
    recommendations: `Recomendaciones Estratégicas:\n\n${prompt}\n\nProporciona recomendaciones específicas y accionables.`
  };

  return enhancements[analysisType as keyof typeof enhancements] || prompt;
}

/**
 * Parsea la respuesta de GPT-5 para extraer información estructurada
 */
function parseAnalysisResponse(content: string, _analysisType: string): {
  summary: string;
  risks: string[];
  recommendations: string[];
} {
  try {
    // Intentar extraer secciones usando regex
    const summaryMatch = content.match(/##? Resumen[:\s]*(.*?)(?=##?|$)/is);
    const risksMatch = content.match(/##? Riesgos?[:\s]*(.*?)(?=##?|$)/is);
    const recommendationsMatch = content.match(/##? Recomendaciones?[:\s]*(.*?)(?=##?|$)/is);

    const summary = summaryMatch ? summaryMatch[1].trim() : content.substring(0, 500);
    
    const risks = risksMatch 
      ? risksMatch[1].split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      : [];
    
    const recommendations = recommendationsMatch 
      ? recommendationsMatch[1].split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      : [];

    return {
      summary,
      risks,
      recommendations
    };
  } catch {
    console.warn('⚠️ Error parseando respuesta, usando contenido completo');
    return {
      summary: content.substring(0, 500),
      risks: [],
      recommendations: []
    };
  }
}

