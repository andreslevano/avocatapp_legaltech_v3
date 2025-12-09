// Prompts base para generación de documentos legales
export const LEGAL_PROMPTS = {
  system: `Eres un asistente jurídico que redacta borradores claros, estructurados y con fundamento legal. 
Responde siempre en español de España salvo que se pida otra cosa. 
Estructura: (1) Encabezado, (2) Hechos, (3) Fundamentos de Derecho (cita normas y jurisprudencia si se indica), 
(4) Suplico/Peticiones, (5) Otrosí, (6) Firma y Lugar/Fecha. 
Ajusta el tono y formalidad según 'tono'. 
Nunca inventes datos personales; usa placeholders si faltan.`,

  user: (data: {
    areaLegal: string;
    tipoEscrito: string;
    hechos: string;
    peticiones: string;
    tono: string;
    datosCliente?: any;
    variables?: Record<string, string>;
  }) => {
    const { areaLegal, tipoEscrito, hechos, peticiones, tono, datosCliente, variables = {} } = data;
    
    let prompt = `Genera un documento legal del tipo "${tipoEscrito}" en el área de "${areaLegal}".

DATOS DEL CLIENTE:
${datosCliente ? Object.entries(datosCliente).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No se proporcionaron datos del cliente'}

HECHOS:
${hechos}

PETICIONES:
${peticiones}

TONO: ${tono}

VARIABLES ADICIONALES:
${Object.entries(variables).map(([key, value]) => `${key}: ${value}`).join('\n')}

Genera un documento profesional, completo y técnicamente correcto.`;

    return prompt;
  }
};

// Plantillas predefinidas por área legal
export const LEGAL_TEMPLATES = {
  'Derecho Civil': {
    'Demanda de reclamación de cantidad': {
      promptSistema: `Eres un abogado especialista en derecho civil. Redacta demandas de reclamación de cantidad con fundamento en el Código Civil español.`,
      promptUsuario: `Redacta una demanda de reclamación de cantidad incluyendo:
1. Datos de las partes
2. Hechos fundamentados
3. Fundamentos de derecho (artículos del Código Civil)
4. Peticiones concretas
5. Otrosí para costas`,
      variables: ['cantidad', 'fechaVencimiento', 'intereses']
    },
    'Escrito de oposición a juicio monitorio': {
      promptSistema: `Eres un abogado especialista en procedimientos civiles. Redacta oposiciones a juicio monitorio.`,
      promptUsuario: `Redacta una oposición a juicio monitorio incluyendo:
1. Datos del procedimiento
2. Motivos de oposición
3. Fundamentos de derecho
4. Peticiones`,
      variables: ['numeroProcedimiento', 'motivosOposicion']
    }
  },
  'Derecho Penal': {
    'Denuncia y querella criminal': {
      promptSistema: `Eres un abogado especialista en derecho penal. Redacta denuncias y querellas criminales.`,
      promptUsuario: `Redacta una denuncia/querella criminal incluyendo:
1. Datos del denunciante y denunciado
2. Hechos delictivos
3. Fundamentos de derecho penal
4. Peticiones`,
      variables: ['tipoDelito', 'fechaHechos', 'lugarHechos']
    }
  }
};

// Helper para construir prompts con plantillas
export const buildPromptWithTemplate = (
  template: any,
  data: any,
  variables: Record<string, string> = {}
) => {
  let systemPrompt = template.promptSistema || LEGAL_PROMPTS.system;
  let userPrompt = template.promptUsuario || LEGAL_PROMPTS.user(data);
  
  // Reemplazar variables en el prompt
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    systemPrompt = systemPrompt.replace(regex, value);
    userPrompt = userPrompt.replace(regex, value);
  });
  
  return { systemPrompt, userPrompt };
};
