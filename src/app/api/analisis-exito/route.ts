import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_ANALISIS, buildAnalisisPrompt } from '@/lib/prompts/analisis-exito-co';

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * POST /api/analisis-exito
 * Analiza la probabilidad de éxito de una demanda o reclamación basándose en documentos OCR
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datosOCR, tipoDocumento, userId } = body;

    // Validar datos requeridos
    if (!datosOCR || !tipoDocumento) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan datos requeridos: datosOCR y tipoDocumento son obligatorios.' 
        },
        { status: 400 }
      );
    }

    // Validar que datosOCR tenga la estructura esperada
    if (!datosOCR.documentos || !Array.isArray(datosOCR.documentos)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'datosOCR debe contener un array de documentos.' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Iniciando análisis de éxito...', {
      tipoDocumento,
      userId,
      numDocumentos: datosOCR.documentos.length
    });

    // Construir el prompt
    const userPrompt = buildAnalisisPrompt(datosOCR, tipoDocumento);

    // Llamar a OpenAI
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ANALISIS },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('OpenAI no devolvió contenido');
    }

    // Parsear la respuesta JSON
    let analisis;
    try {
      analisis = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('❌ Error parseando respuesta de OpenAI:', parseError);
      console.error('Respuesta recibida:', responseContent.substring(0, 500));
      throw new Error('La respuesta de OpenAI no es JSON válido');
    }

    // Validar estructura básica
    if (!analisis.analisis || !analisis.analisis.porcentajeExito) {
      console.warn('⚠️ Respuesta de OpenAI no tiene la estructura esperada:', analisis);
      // Intentar construir una respuesta válida con los datos disponibles
      analisis = {
        analisis: {
          porcentajeExito: analisis.analisis?.porcentajeExito || 50,
          nivelConfianza: analisis.analisis?.nivelConfianza || 'regular',
          resumenEjecutivo: analisis.analisis?.resumenEjecutivo || 'Análisis completado',
          fortalezas: analisis.analisis?.fortalezas || [],
          debilidades: analisis.analisis?.debilidades || [],
          recomendaciones: analisis.analisis?.recomendaciones || []
        },
        evaluacionDetallada: analisis.evaluacionDetallada || {},
        recomendacionesEspecificas: analisis.recomendacionesEspecificas || {}
      };
    }

    console.log('✅ Análisis completado:', {
      porcentajeExito: analisis.analisis.porcentajeExito,
      nivelConfianza: analisis.analisis.nivelConfianza
    });

    return NextResponse.json({
      success: true,
      data: {
        analisis,
        metadata: {
          tipoDocumento,
          userId,
          timestamp: new Date().toISOString(),
          numDocumentos: datosOCR.documentos.length
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error en análisis de éxito:', error);
    
    // Asegurar que siempre devolvemos JSON
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al analizar la probabilidad de éxito',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

