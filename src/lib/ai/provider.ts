import OpenAI from 'openai';
import { getOpenAIClient } from '@/lib/openai-client';

let lastOpenAIRequest: any = null;

export function getLastOpenAIRequest() { 
  return lastOpenAIRequest; 
}

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  return new OpenAI({ apiKey });
}

export async function callChat({ 
  model, 
  system, 
  user, 
  temperature = 0.3, 
  top_p = 1 
}: {
  model: string; 
  system: string; 
  user: string; 
  temperature?: number; 
  top_p?: number;
}) {
  lastOpenAIRequest = { model, system, user };
  
  // Usar GPT-5 real si está configurado
  if (process.env.OPENAI_MODEL === 'gpt-5' && process.env.OPENAI_MOCK === '0') {
    try {
      console.log('🤖 Usando GPT-5 real para generación...');
      const openaiClient = getOpenAIClient();
      const result = await openaiClient.generateContent(user, {
        temperature,
        systemPrompt: system
      });
      
      return {
        content: result.content,
        timeMs: 0, // El cliente maneja el timing internamente
        mock: false
      };
    } catch (error: any) {
      console.error('❌ Error con GPT-5 real:', error);
      // Fallback al método original si GPT-5 falla
    }
  }
  
  const run = async () => {
    const c = client();
    const t0 = Date.now();
    const res = await c.chat.completions.create({
      model, 
      temperature, 
      top_p,
      messages: [
        { role: 'system', content: system }, 
        { role: 'user', content: user }
      ],
    });
    return { 
      content: res.choices[0]?.message?.content ?? '', 
      timeMs: Date.now() - t0 
    };
  };

  // Reintentos con backoff exponencial
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { 
      return await run(); 
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      const retriable = /timeout|fetch failed|dns|econn|socket|temporar|unavailable|5\d\d/.test(msg);
      
      if (!retriable || attempt === 3) {
        // Si está habilitado el mock, usar datos simulados
        if (process.env.OPENAI_MOCK === '1') {
          console.log('🔄 OpenAI falló, usando mock data...');
          const { generateReclamacionCantidadMock } = await import('../__mocks__/openai-reclamacion');
          return { 
            content: JSON.stringify(generateReclamacionCantidadMock({})), 
            timeMs: 0, 
            mock: true 
          };
        }
        throw e;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

export function getLastPrompt() { 
  return lastOpenAIRequest; 
}

