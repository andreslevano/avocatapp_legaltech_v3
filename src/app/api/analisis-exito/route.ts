import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { SYSTEM_PROMPT_ANALISIS, buildAnalisisPrompt } from '@/lib/prompts/analisis-exito-co';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { datosOCR, tipoDocumento, userId } = body;

    if (!datosOCR || !tipoDocumento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos OCR y tipo de documento son requeridos'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Iniciando análisis de éxito con ChatGPT...', {
      tipoDocumento,
      userId: userId || 'demo_user'
    });

    // Validar que OpenAI esté configurado
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.error('❌ OPENAI_API_KEY no está configurada');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OPENAI_NOT_CONFIGURED',
            message: 'OpenAI API Key no está configurada',
            hint: 'Configura OPENAI_API_KEY en .env.local'
          }
        },
        { status: 500 }
      );
    }

    // Generar análisis con ChatGPT
    const userPrompt = buildAnalisisPrompt(datosOCR, tipoDocumento);
    
    console.log('🤖 Enviando prompt de análisis a ChatGPT...');
    const openaiClient = getOpenAIClient();
    
    // Añadir timeout para evitar que se quede colgado
    const generatePromise = openaiClient.generateContent(userPrompt, {
      systemPrompt: SYSTEM_PROMPT_ANALISIS,
      temperature: 0.2,
      maxTokens: 2000
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: La generación de OpenAI tardó más de 60 segundos')), 60000);
    });
    
    const result = await Promise.race([generatePromise, timeoutPromise]) as any;

    const content = result.content;
    // const timeMs = 0; // TODO: Get from result metadata when available

    if (!content) {
      throw new Error('No se recibió análisis del modelo');
    }

    // Parsear JSON del análisis
    let analisisJSON;
    try {
      analisisJSON = JSON.parse(content);
    } catch (_parseError: any) {
      // Si falla el parseo, intentar extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analisisJSON = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON válido del análisis');
      }
    }

    const elapsedMs = Date.now() - startTime;
    
    console.log('✅ Análisis de éxito completado', {
      porcentajeExito: analisisJSON.analisis?.porcentajeExito || 0,
      nivelConfianza: analisisJSON.analisis?.nivelConfianza || 'baja',
      elapsedMs,
      tokensUsados: 0 // TODO: Get from result metadata when available
    });

    // Devolver análisis completo
    return NextResponse.json({
      success: true,
      data: {
        analisis: analisisJSON,
        metadata: {
          requestId,
          elapsedMs,
          tokensUsados: 0, // TODO: Get from result metadata when available
          modelo: 'gpt-4o',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error('❌ Error en análisis de éxito:', error);
    console.error('Stack:', error.stack);
    
    // Mensajes de error más específicos
    let errorMessage = 'Error realizando análisis de éxito';
    let errorHint = 'Intenta de nuevo o contacta soporte si el problema persiste';
    
    if (error.message?.includes('OPENAI_API_KEY') || error.message?.includes('API key')) {
      errorMessage = 'OpenAI API Key no configurada';
      errorHint = 'Verifica que OPENAI_API_KEY esté configurada en .env.local';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Límite de tasa de OpenAI excedido';
      errorHint = 'Espera unos minutos e intenta de nuevo';
    } else if (error.message?.includes('No se recibió')) {
      errorMessage = 'No se recibió respuesta de OpenAI';
      errorHint = 'Verifica la configuración de OpenAI';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALISIS_FAILED',
          message: errorMessage,
          details: error.message,
          hint: errorHint
        },
        metadata: {
          requestId,
          elapsedMs
        }
      },
      { status: 500 }
    );
  }
}


