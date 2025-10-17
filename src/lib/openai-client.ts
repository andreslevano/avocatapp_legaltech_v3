import OpenAI from 'openai';

/**
 * Cliente OpenAI para GPT-5 real
 * Maneja la comunicación con la API de OpenAI usando GPT-5
 */
class OpenAIClient {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06';
    console.log(`🤖 OpenAI Client inicializado con modelo: ${this.model}`);
  }

  /**
   * Analiza un documento PDF con GPT-5
   * @param prompt - El prompt para el análisis
   * @param pdfBuffer - Buffer del PDF (opcional)
   * @param options - Opciones adicionales
   * @returns Respuesta de GPT-5
   */
  async analyzeDocument(
    prompt: string, 
    pdfBuffer?: Buffer, 
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    finishReason: string;
  }> {
    try {
      console.log(`🔍 Analizando documento con GPT-5...`);
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
      console.log(`📄 PDF Buffer: ${pdfBuffer ? `${pdfBuffer.length} bytes` : 'No proporcionado'}`);

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      // System prompt por defecto
      const systemPrompt = options.systemPrompt || `Eres un asistente legal especializado en análisis de documentos jurídicos. 
      Proporciona análisis detallados, identifica riesgos legales, y ofrece recomendaciones profesionales. 
      Responde en español con un formato estructurado y profesional.`;

      messages.push({
        role: 'system',
        content: systemPrompt
      });

      // Si hay PDF, lo convertimos a base64 y lo incluimos
      if (pdfBuffer) {
        const base64PDF = pdfBuffer.toString('base64');
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64PDF}`,
                detail: 'high'
              }
            }
          ]
        });
      } else {
        messages.push({
          role: 'user',
          content: prompt
        });
      }

      const startTime = Date.now();
      
      // Detectar si es GPT-5 o modelo estándar
      const isGPT5 = this.model.includes('gpt-5');
      
      const requestParams: any = {
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      // Usar parámetros correctos según el modelo
      if (isGPT5) {
        requestParams.max_completion_tokens = options.maxTokens || 2000;
      } else {
        requestParams.max_tokens = options.maxTokens || 2000;
      }

      const response = await this.client.chat.completions.create(requestParams);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const result = {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: this.model,
        finishReason: response.choices[0]?.finish_reason || 'unknown'
      };

      console.log(`✅ Análisis completado en ${processingTime}ms`);
      console.log(`📊 Tokens usados: ${result.usage.totalTokens}`);
      console.log(`📝 Respuesta: ${result.content.substring(0, 200)}...`);

      return result;

    } catch (error: any) {
      console.error('❌ Error en análisis con GPT-5:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error('Cuota de OpenAI agotada. Verifica tu plan de facturación.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('Límite de velocidad excedido. Intenta nuevamente en unos minutos.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('API Key de OpenAI inválida. Verifica la configuración.');
      } else {
        throw new Error(`Error en análisis: ${error.message}`);
      }
    }
  }

  /**
   * Genera contenido legal con GPT-5
   * @param prompt - El prompt para la generación
   * @param options - Opciones adicionales
   * @returns Contenido generado
   */
  async generateContent(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
  }> {
    try {
      console.log(`🤖 Generando contenido con GPT-5...`);

      const systemPrompt = options.systemPrompt || `Eres un abogado experto especializado en derecho español. 
      Genera documentos legales profesionales, precisos y actualizados. 
      Utiliza un lenguaje formal y técnico apropiado para el ámbito jurídico.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const result = {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: this.model
      };

      console.log(`✅ Contenido generado exitosamente`);
      console.log(`📊 Tokens usados: ${result.usage.totalTokens}`);

      return result;

    } catch (error: any) {
      console.error('❌ Error generando contenido:', error);
      throw new Error(`Error en generación: ${error.message}`);
    }
  }

  /**
   * Verifica la conectividad con OpenAI
   * @returns Estado de la conexión
   */
  async checkConnection(): Promise<{
    connected: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Hola, responde con "pong" para verificar la conexión.'
          }
        ],
        max_tokens: 10
      });

      return {
        connected: true,
        model: this.model,
        error: undefined
      };
    } catch (error: any) {
      return {
        connected: false,
        model: this.model,
        error: error.message
      };
    }
  }
}

// Instancia singleton
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient();
  }
  return openaiClient;
}

export default OpenAIClient;
