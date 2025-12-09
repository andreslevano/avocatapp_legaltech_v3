export const SYSTEM_PROMPT = `
Eres abogado constitucionalista en Colombia. Redacta un borrador profesional de ACCIÓN DE TUTELA conforme a la Constitución Política (art. 86) y el Decreto 2591 de 1991.

Reglas:
- Lenguaje claro, formal y conciso en español (Colombia).
- Principios: informalidad, inmediatez, subsidiariedad, eficacia e integralidad de la tutela.
- Estructura obligatoria: Encabezado (juez competente), Partes, HECHOS numerados, FUNDAMENTOS (competencia, legitimación, subsidiariedad, inmediatez, fondo), PETICIONES, MEDIDA PROVISIONAL (si procede), PRUEBAS, ANEXOS, JURAMENTO, LUGAR/FECHA/FIRMA.
- Competencia orientativa: juez municipal o del circuito según reglas generales (no lo trates como asesoría, usa formulación prudente y neutral).
- Citas normativas solo por referencia (p.ej., "art. 86 CP", "Decreto 2591/1991"), sin transcribir largos textos ni inventar jurisprudencia.
- Si faltan datos, usa [DATO FALTANTE].
- Devuelve EXCLUSIVAMENTE JSON que cumple el esquema acordado. NADA de Markdown.
`;

export function buildUserPrompt(payload: {
  vulnerador: string;
  hechos: string;
  derecho: string;
  peticiones: string;
  medidasProvisionales?: boolean;
  anexos?: string[];
  ciudad?: string;
}): string {
  const derechosMap: Record<string, string> = {
    'vida': 'derecho a la vida',
    'salud': 'derecho a la salud',
    'minimo_vital': 'derecho al mínimo vital',
    'peticion': 'derecho de petición',
    'debido_proceso': 'derecho al debido proceso',
    'igualdad': 'derecho a la igualdad',
    'educacion': 'derecho a la educación',
    'libertad_expresion': 'derecho a la libertad de expresión',
    'intimidad': 'derecho a la intimidad',
    'habeas_data': 'derecho al hábeas data'
  };

  const derechoTexto = derechosMap[payload.derecho] || payload.derecho;

  return `
DATOS DEL CASO:
- Persona o entidad que vulnera: ${payload.vulnerador}
- Derecho fundamental vulnerado: ${derechoTexto}
- Ciudad: ${payload.ciudad || 'Bogotá'}

RELATO DE HECHOS:
${payload.hechos}

PETICIONES:
${payload.peticiones}

${payload.medidasProvisionales ? 'SOLICITA MEDIDAS PROVISIONALES: Sí' : 'MEDIDAS PROVISIONALES: No'}

${payload.anexos && payload.anexos.length > 0 ? `ANEXOS: ${payload.anexos.join(', ')}` : 'ANEXOS: Ninguno'}

REQUISITOS ESPECÍFICOS:
1. Claridad en subsidiariedad: indicar si no hay otro mecanismo judicial eficaz para proteger el derecho.
2. Inmediatez: justificar la urgencia temporal (hechos recientes o continuidad de la vulneración).
3. Competencia: determinar si corresponde a juez municipal o del circuito según las reglas generales.
4. Legitimación: identificar claramente al accionante y al accionado.

IMPORTANTE: Devuelve EXCLUSIVAMENTE JSON válido que cumple el esquema. No incluyas texto adicional, explicaciones ni formato Markdown.
`;
}

