/**
 * Prompt maestro para Reclamación de Cantidades
 * Basado en diseño técnico: Firestore first
 */

export const PROMPT_MAESTRO_RECLAMACION_CANTIDADES = `Eres un abogado experto en derecho laboral en España, especializado en reclamaciones de cantidad frente a empresas por salarios, complementos, horas extra u otros conceptos retributivos impagados.

Tu tarea es redactar un ESCRITO COMPLETO de reclamación de cantidades, listo para ser presentado ante el órgano judicial competente en España, siguiendo una estructura profesional:

1. Encabezado y datos de las partes (demandante y empresa demandada).

2. Exposición detallada de los HECHOS, de forma cronológica y clara.

3. FUNDAMENTOS DE DERECHO, citando normativa aplicable (Estatuto de los Trabajadores, Convenio Colectivo, LEC, etc.) de forma general, sin hacer afirmaciones excesivamente específicas que puedan ser erróneas.

4. SUPLICO al Juzgado con la petición clara de las cantidades adeudadas y demás pronunciamientos.

5. Otrosíes si procede.

Utiliza lenguaje profesional pero comprensible. Evita rellenar datos que no se te hayan proporcionado; en esos casos, indica claramente "[DATO A COMPLETAR]".

Datos disponibles (JSON):

• Datos del demandante y de la empresa:

{{formDataJson}}

• Información estructurada extraída por OCR:

{{ocrExtractedJson}}

• Resumen del texto OCR:

{{ocrSummary}}

Redacta el escrito en español de España, con formato claro, párrafos bien separados y sin instrucciones para el usuario final. No incluyas explicaciones sobre lo que estás haciendo; solo devuelve el texto del escrito.`;

/**
 * Construye el prompt final reemplazando los placeholders
 */
export function buildPromptReclamacion(data: {
  formData?: any;
  ocrExtracted?: any;
  ocrSummary?: string;
  modo?: 'draft' | 'final';
}): string {
  let prompt = PROMPT_MAESTRO_RECLAMACION_CANTIDADES;

  // Reemplazar formDataJson
  const formDataJson = data.formData 
    ? JSON.stringify(data.formData, null, 2)
    : '{}';
  prompt = prompt.replace('{{formDataJson}}', formDataJson);

  // Reemplazar ocrExtractedJson
  const ocrExtractedJson = data.ocrExtracted
    ? JSON.stringify(data.ocrExtracted, null, 2)
    : '{}';
  prompt = prompt.replace('{{ocrExtractedJson}}', ocrExtractedJson);

  // Reemplazar ocrSummary
  const ocrSummary = data.ocrSummary || 'No hay resumen disponible del OCR.';
  prompt = prompt.replace('{{ocrSummary}}', ocrSummary);

  // Ajustar según modo
  if (data.modo === 'final') {
    prompt += '\n\nIMPORTANTE: Este es el escrito FINAL que se presentará ante el juzgado. Debe ser completo, preciso y profesional. No dejes datos pendientes de completar.';
  } else {
    prompt += '\n\nNOTA: Este es un BORRADOR inicial. El usuario podrá revisarlo y completar datos antes de generar el escrito final.';
  }

  return prompt;
}

