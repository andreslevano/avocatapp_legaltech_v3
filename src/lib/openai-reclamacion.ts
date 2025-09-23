import OpenAI from 'openai';
import { ReclamacionCantidadRequest, ModelOutput, ModelOutputSchema } from './validate-reclamacion';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts/reclamacion_es';
import { apiLogger } from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getModel = () => {
  if (process.env.USE_CHEAPER_MODEL === 'true') {
    return 'gpt-4o-mini';
  }
  return 'gpt-4o';
};

export async function generateReclamacionCantidad(input: ReclamacionCantidadRequest): Promise<ModelOutput> {
  const startTime = Date.now();
  
  try {
    const userPrompt = buildUserPrompt(input);
    
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No se recibió contenido del modelo');
    }

    // Intentar parsear el JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // Si falla el parseo, intentar extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON válido de la respuesta');
      }
    }

    // Validar con Zod
    const validationResult = ModelOutputSchema.safeParse(parsedContent);
    
    if (!validationResult.success) {
      apiLogger.error('validation-failed', new Error('Model output validation failed'), {
        errors: validationResult.error.errors,
        content: content.substring(0, 500)
      });
      
      // Reintentar con mensaje más estricto
      const retryCompletion = await openai.chat.completions.create({
        model: getModel(),
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT + '\n\nIMPORTANTE: Debes devolver EXCLUSIVAMENTE un JSON válido. No incluyas texto adicional, explicaciones o markdown.',
          },
          {
            role: 'user',
            content: userPrompt + '\n\nResponde SOLO con el JSON válido según el esquema MODEL_OUTPUT.',
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 1,
      });

      const retryContent = retryCompletion.choices[0]?.message?.content;
      if (!retryContent) {
        throw new Error('No se recibió contenido en el reintento');
      }

      const retryParsed = JSON.parse(retryContent);
      const retryValidation = ModelOutputSchema.safeParse(retryParsed);
      
      if (!retryValidation.success) {
        throw new Error(`Validación fallida en reintento: ${retryValidation.error.errors.map(e => e.message).join(', ')}`);
      }
      
      return retryValidation.data;
    }

    const elapsedMs = Date.now() - startTime;
    apiLogger.info('reclamacion-generated', {
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
      elapsedMs,
      cauceRecomendado: validationResult.data.cauceRecomendado
    });

    return validationResult.data;
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error('reclamacion-generation-failed', error, { elapsedMs });
    throw new Error('Error generando la reclamación de cantidad');
  }
}
