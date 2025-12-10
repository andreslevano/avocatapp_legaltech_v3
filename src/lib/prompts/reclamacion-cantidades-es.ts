/**
 * Prompt específico para generar reclamaciones de cantidades en España
 * Basado en la legislación española vigente
 */

export const RECLAMACION_CANTIDADES_PROMPT = `Eres un experto abogado español especializado en derecho civil y mercantil. Tu tarea es generar una reclamación de cantidades profesional y completa según la legislación española.

INSTRUCCIONES:
1. El documento debe seguir el formato legal estándar en España
2. Debe incluir todos los fundamentos legales aplicables
3. Debe ser profesional, claro y conciso
4. Debe incluir plazo de pago según la ley
5. Debe estar redactado en español formal

LEGISLACIÓN APLICABLE:
- Código Civil español (Artículos 1101, 1107, 1902)
- Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad en las operaciones comerciales
- Ley 1/2000, de 7 de enero, de Enjuiciamiento Civil
- Jurisprudencia del Tribunal Supremo sobre reclamaciones de deudas

FORMATO DEL DOCUMENTO:
1. Encabezado con datos del reclamante y reclamado
2. Exposición de hechos
3. Fundamentos de derecho
4. Petición concreta
5. Plazo de pago
6. Advertencia de acciones legales
7. Firma y fecha

DATOS DEL CASO:
{caseData}

GENERA una reclamación de cantidades completa, profesional y lista para enviar, siguiendo exactamente el formato legal español.`;

export function buildReclamacionPrompt(data: {
  documentos: Array<{
    nombre: string;
    categoria: string;
    textoExtraido?: string;
  }>;
  cantidadReclamada?: number;
  deudor?: string;
  fechas?: string[];
  detallesAdicionales?: string;
}): string {
  let caseData = 'DOCUMENTOS PRESENTADOS:\n';
  
  data.documentos.forEach((doc, index) => {
    caseData += `${index + 1}. ${doc.nombre} (${doc.categoria})\n`;
    if (doc.textoExtraido) {
      // Limitar el texto extraído a 500 caracteres para no exceder tokens
      const textoLimitado = doc.textoExtraido.substring(0, 500);
      caseData += `   Texto relevante: ${textoLimitado}${doc.textoExtraido.length > 500 ? '...' : ''}\n`;
    }
  });
  
  caseData += '\n';
  
  if (data.cantidadReclamada) {
    caseData += `CANTIDAD RECLAMADA: ${data.cantidadReclamada.toFixed(2)} €\n`;
  }
  
  if (data.deudor) {
    caseData += `DEUDOR: ${data.deudor}\n`;
  }
  
  if (data.fechas && data.fechas.length > 0) {
    caseData += `FECHAS RELEVANTES: ${data.fechas.join(', ')}\n`;
  }
  
  if (data.detallesAdicionales) {
    caseData += `\nDETALLES ADICIONALES:\n${data.detallesAdicionales}\n`;
  }
  
  return RECLAMACION_CANTIDADES_PROMPT.replace('{caseData}', caseData);
}

