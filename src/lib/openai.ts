import OpenAI from 'openai';
import { GenerateDocumentRequest } from './validate';
import { LEGAL_PROMPTS, buildPromptWithTemplate } from './prompts/legal';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuración del modelo
const getModel = () => {
  if (process.env.USE_CHEAPER_MODEL === 'true') {
    return 'gpt-4o-mini';
  }
  return 'gpt-4o';
};

// Función principal para generar documentos
export const generateDocument = async (data: GenerateDocumentRequest, template?: any) => {
  const startTime = Date.now();
  
  try {
    let systemPrompt = LEGAL_PROMPTS.system;
    let userPrompt = LEGAL_PROMPTS.user(data);
    
    // Si hay plantilla, usar sus prompts
    if (template) {
      const builtPrompts = buildPromptWithTemplate(template, data, {});
      systemPrompt = builtPrompts.systemPrompt;
      userPrompt = builtPrompts.userPrompt;
    }
    
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.2,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    const elapsedMs = Date.now() - startTime;
    const content = completion.choices[0]?.message?.content || 'Document generation failed';
    
    return {
      content,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
      elapsedMs,
    };
  } catch (error) {
    console.error('Error generating document:', error);
    throw new Error('Failed to generate document');
  }
};

// Funciones legacy para compatibilidad
export const analyzeDocument = async (documentText: string, analysisType: string) => {
  try {
    const prompt = `Analyze the following legal document for ${analysisType}. 
    Provide a comprehensive analysis including key points, potential risks, and recommendations.
    
    Document:
    ${documentText}
    
    Analysis:`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert AI assistant. Provide clear, accurate, and professional legal analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || 'Analysis failed';
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw new Error('Failed to analyze document');
  }
};

export const generateCaseSummary = async (caseDetails: string) => {
  try {
    const prompt = `Generate a concise case summary for the following legal case. 
    Include key facts, legal issues, and outcomes.
    
    Case Details:
    ${caseDetails}
    
    Summary:`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert AI assistant. Generate clear and concise case summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content || 'Summary generation failed';
  } catch (error) {
    console.error('Error generating case summary:', error);
    throw new Error('Failed to generate case summary');
  }
};

export const legalResearch = async (query: string, jurisdiction: string = 'general') => {
  try {
    const prompt = `Conduct legal research on the following query for ${jurisdiction} jurisdiction. 
    Provide relevant case law, statutes, and legal principles.
    
    Query:
    ${query}
    
    Research Results:`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a legal research AI assistant. Provide comprehensive and accurate legal research results.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || 'Research failed';
  } catch (error) {
    console.error('Error conducting legal research:', error);
    throw new Error('Failed to conduct legal research');
  }
};

export const generateLegalDocument = async (documentType: string, legalArea: string, caseDetails?: string) => {
  try {
    const prompt = `Genera un documento legal completo del tipo "${documentType}" en el área de "${legalArea}".
    
    ${caseDetails ? `Detalles del caso:
    ${caseDetails}` : ''}
    
    El documento debe incluir:
    1. Encabezado con datos del tribunal y partes
    2. Hechos fundamentados
    3. Fundamentos de derecho
    4. Pretensiones
    5. Firma y fecha
    
    Genera un documento profesional, completo y técnicamente correcto.`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: 'Eres un abogado experto especializado en derecho español. Genera documentos legales profesionales, técnicamente correctos y completos. Usa terminología jurídica apropiada y estructura formal.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content || 'Document generation failed';
  } catch (error) {
    console.error('Error generating legal document:', error);
    throw new Error('Failed to generate legal document');
  }
};

export default openai;
