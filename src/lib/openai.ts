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

/**
 * Categoriza y extrae datos estructurados de un documento usando ChatGPT.
 * Máximo 15 campos por documento, relevantes según el tipo.
 */
export interface ExtractedDocumentResult {
  country: string;
  documentType: string;
  emisor: string;
  receptor: string;
  fields: { key: string; value: string }[];
}

export async function extractDocumentDataWithAI(
  documentText: string,
  fileName: string,
  options?: { excelStructure?: string }
): Promise<ExtractedDocumentResult> {
  const usePozuelo = options?.excelStructure === 'asesoria-pozuelo';
  const systemPrompt = usePozuelo
    ? `Eres un asistente experto en extracción de datos de facturas/recibos para asesoría fiscal.
Analiza el texto y devuelve UNICAMENTE un JSON válido con esta estructura (sin markdown):
{
  "country": "país (España, Brasil, etc.)",
  "documentType": "Factura o Recibo",
  "emisor": "nombre del emisor",
  "receptor": "nombre del receptor",
  "fields": [
    {"key": "Nº FACTURA", "value": "número de factura"},
    {"key": "FECHA", "value": "fecha en formato DD/MM/YYYY"},
    {"key": "TOTAL", "value": "importe total"},
    {"key": "CIF", "value": "CIF/NIF del emisor"},
    {"key": "BASE 0%IVA", "value": "base imponible 0%"},
    {"key": "CUOTA 0%IVA", "value": "cuota IVA 0%"},
    {"key": "BASE 4%IVA", "value": "base imponible 4%"},
    {"key": "CUOTA 4%IVA", "value": "cuota IVA 4%"},
    {"key": "BASE 10%IVA", "value": "base imponible 10%"},
    {"key": "CUOTA 10%IVA", "value": "cuota IVA 10%"},
    {"key": "BASE 21%IVA", "value": "base imponible 21%"},
    {"key": "CUOTA 21%IVA", "value": "cuota IVA 21%"},
    {"key": "%JE IRPF", "value": "porcentaje IRPF"},
    {"key": "CUOTA IRPF", "value": "cuota IRPF"},
    {"key": "MONEDA", "value": "EUR, BRL, etc."}
  ]
}
Reglas: Usa EXACTAMENTE las claves indicadas en "fields". Incluye solo los campos que encuentres. Usa "-" si no hay valor. Responde SOLO con el JSON.`
    : `Eres un asistente experto en extracción de datos de documentos. 
Analiza el texto del documento y devuelve UNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "country": "país de origen del documento (ej: España, Estados Unidos, México)",
  "documentType": "tipo de documento: Factura, Recibo, Orden de compra, Contrato, Correspondencia, Certificado, Otro",
  "emisor": "nombre o entidad que emite el documento",
  "receptor": "nombre o entidad destinataria",
  "fields": [
    {"key": "nombre del campo", "value": "valor extraído"}
  ]
}

Reglas:
- Máximo 15 campos en "fields". Extrae solo los más relevantes según el tipo de documento.
- Para Factura/Invoice: Emisor, Receptor, Número, Fecha, Base imponible, IVA, Total, Moneda, etc.
- Para Recibo: Emisor, Fecha, Importe, Concepto, Forma de pago, etc.
- Para Orden: Proveedor, Cliente, Número orden, Fecha, Productos, Total, etc.
- Usa "-" cuando no encuentres un valor.
- Responde SOLO con el JSON, sin texto adicional.`;

  const userPrompt = `Documento: ${fileName}

Texto del documento:
${documentText.slice(0, 12000)}

Devuelve el JSON con los datos extraídos:`;

  try {
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr) as ExtractedDocumentResult;

    if (!parsed.fields || !Array.isArray(parsed.fields)) {
      parsed.fields = [];
    }
    parsed.fields = parsed.fields.slice(0, 25);
    parsed.country = String(parsed.country || 'Desconocido').trim();
    parsed.documentType = String(parsed.documentType || 'Otro').trim();
    parsed.emisor = String(parsed.emisor || '-').trim();
    parsed.receptor = String(parsed.receptor || '-').trim();

    return parsed;
  } catch (error) {
    console.error('Error extrayendo datos con IA:', error);
    throw new Error('No se pudo extraer datos del documento con IA');
  }
}

/** Extract multiple documents from one page (2+ invoices per page) */
export async function extractMultiDocumentDataWithAI(
  documentText: string,
  fileName: string,
  pageLabel: string,
  options?: { excelStructure?: string }
): Promise<ExtractedDocumentResult[]> {
  const usePozuelo = options?.excelStructure === 'asesoria-pozuelo';
  const fieldsHint = usePozuelo
    ? 'Para cada documento usa claves: Nº FACTURA, FECHA, TOTAL, CIF, BASE 0%IVA, CUOTA 0%IVA, etc.'
    : 'Extrae los campos más relevantes (emisor, receptor, número, fecha, total, etc.).';
  const systemPrompt = `Eres un asistente experto en extracción de datos. Esta página puede contener 2 o más facturas/recibos distintos.
Analiza el texto y devuelve UNICAMENTE un JSON con esta estructura (sin markdown):
{
  "documents": [
    {
      "country": "país",
      "documentType": "Factura o Recibo",
      "emisor": "nombre emisor",
      "receptor": "nombre receptor",
      "fields": [{"key": "nombre campo", "value": "valor"}]
    }
  ]
}
Reglas: Separa cada factura/recibo en un elemento distinto de "documents". ${fieldsHint} Usa "-" si no hay valor. Responde SOLO con el JSON.`;

  const userPrompt = `Documento: ${fileName} (página ${pageLabel})

Texto (puede tener varias facturas):
${documentText.slice(0, 12000)}

Devuelve el JSON con "documents" array:`;

  const completion = await openai.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(jsonStr) as { documents?: ExtractedDocumentResult[] };
  const docs = parsed.documents || [];
  return docs.map((d) => ({
    country: String(d.country || 'Desconocido').trim(),
    documentType: String(d.documentType || 'Otro').trim(),
    emisor: String(d.emisor || '-').trim(),
    receptor: String(d.receptor || '-').trim(),
    fields: (d.fields || []).slice(0, 25),
  }));
}

export default openai;
