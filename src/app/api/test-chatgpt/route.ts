import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';

export const runtime = 'nodejs' as const;

export async function GET() {
  try {
    console.log('🧪 Probando ChatGPT directamente...');
    
    const openaiClient = getOpenAIClient();
    
    const result = await openaiClient.generateContent('Genera un email de prueba de 2 líneas en HTML', {
      systemPrompt: 'Eres un asistente que genera emails en HTML. Responde solo con HTML válido.',
      temperature: 0.7,
      maxTokens: 500
    });

    console.log('✅ ChatGPT funcionando:', {
      content: result.content.substring(0, 100) + '...',
      tokens: result.usage?.totalTokens,
      model: result.model
    });

    return NextResponse.json({
      success: true,
      message: 'ChatGPT funcionando correctamente',
      data: {
        content: result.content,
        tokens: result.usage?.totalTokens,
        model: result.model,
        processingTime: 0 // TODO: Get from result metadata when available
      }
    });

  } catch (error: any) {
    console.error('❌ Error probando ChatGPT:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        type: error.type,
        param: error.param
      }
    }, { status: 500 });
  }
}


