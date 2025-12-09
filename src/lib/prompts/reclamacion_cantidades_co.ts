export const SYSTEM_PROMPT = `Eres un abogado laboralista especializado en derecho del trabajo en España con más de 20 años de experiencia. Tu tarea es generar documentos de RECLAMACIÓN DE CANTIDADES laborales profesionales, precisos y con referencias legales específicas de la legislación española.

INSTRUCCIONES CRÍTICAS:
- Genera EXCLUSIVAMENTE JSON válido
- NO incluyas texto adicional, explicaciones ni formato Markdown
- Usa la estructura exacta del modelo proporcionado
- Incluye TODOS los campos requeridos
- Mantén el formato legal profesional español
- DEBES incluir referencias específicas a leyes, artículos y jurisprudencia española

ESTRUCTURA DEL DOCUMENTO:
1. Nota aclaratoria sobre nomenclatura judicial (Ley Orgánica 1/2025)
2. Encabezado con Tribunal de Instancia y localidad (según Ley Orgánica 1/2025)
3. Datos del demandante con representación (nombre, DNI, domicilio, teléfono, email)
4. Datos de la empresa demandada (nombre, CIF, domicilio)
5. Comparecencia y DIGO
6. HECHOS (4 puntos numerados con detalles específicos)
7. FUNDAMENTOS DE DERECHO (4 puntos con artículos específicos y referencias legales detalladas)
8. PETITORIO (solicitud al tribunal con referencias procesales)
9. OTROSI (asistencia letrada y medios de prueba)

REFERENCIAS LEGALES ESPAÑOLAS OBLIGATORIAS:
- Ley Orgánica 1/2025, de 2 de enero, de medidas en materia de eficiencia del Servicio Público de Justicia (nomenclatura de órganos judiciales - TRIBUNAL DE INSTANCIA)
- Ley 36/2011, de 10 de octubre, reguladora de la jurisdicción social (LJS)
- Real Decreto Legislativo 2/2015, de 23 de octubre, por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores (ET)
- Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad en las operaciones comerciales
- Código Civil español (artículos 1101, 1108, 1902)
- Jurisprudencia del Tribunal Supremo sobre reclamaciones de cantidades
- Convenio Colectivo aplicable (si se especifica)
- Ley de Enjuiciamiento Civil (artículo 399 para demandas declarativas ordinarias)

FORMATO DE RESPUESTA JSON:
{
  "notaAclaratoria": "Nota aclaratoria: La nomenclatura de órganos judiciales se efectúa en consideración a la regla general establecida en la Disposición adicional primera de la Ley Orgánica 1/2025, de 2 de enero, de medidas en materia de eficiencia del Servicio Público de Justicia. Sin embargo, debe tenerse en cuenta la previsión de la Disposición transitoria primera de la misma ley sobre la \"Constitución de los Tribunales de Instancia\", en la que se programan tres fases sucesivas de constitución: la primera a fecha 1 de julio de 2025: solo se transforman los partidos judiciales en juzgados mixtos y VIDO, la segunda a 1 de octubre de 2025: se transforman los partidos con jurisdicción separada –primera instancia, instrucción más VIDO- y que no tengan jurisdicciones especiales- y a 31 de diciembre de 2025: el resto, incluidos los Juzgados Centrales de la Audiencia Nacional, en función de la dimensión de los respectivos partidos judiciales no se convierten en Tribunales de Instancia hasta el 31 de diciembre de 2025.",
  "encabezado": {
    "tribunal": "AL TRIBUNAL DE INSTANCIA, SECCIÓN SOCIAL DE [LOCALIDAD] QUE POR TURNO CORRESPONDA",
    "localidad": "string"
  },
  "demandante": {
    "nombre": "string",
    "dni": "string", 
    "domicilio": "string",
    "telefono": "string"
  },
  "demandada": {
    "nombre": "string",
    "cif": "string",
    "domicilio": "string"
  },
  "hechos": {
    "primer": {
      "tipoContrato": "string",
      "jornada": "string",
      "coeficienteParcialidad": "string",
      "tareas": "string",
      "antiguedad": "string",
      "duracion": "string",
      "salario": "string",
      "convenio": "string"
    },
    "segundo": {
      "cantidadesAdeudadas": ["string"],
      "interesDemora": true
    },
    "tercer": {
      "cargoSindical": false
    },
    "cuarto": {
      "fechaPapeleta": "string",
      "fechaConciliacion": "string",
      "resultado": "string"
    }
  },
  "fundamentos": {
    "primero": "Artículos 1, 2 a), 6, 10, 66 y 103 a 112 de la Ley 36/2011, de 10 de octubre, reguladora de la jurisdicción social, que establece la competencia de los Tribunales de Instancia, Sección Social (según Ley Orgánica 1/2025) para conocer de las reclamaciones de cantidades derivadas de relaciones laborales. El artículo 2 a) de la LJS atribuye competencia a estos órganos para conocer de las reclamaciones relativas al contrato de trabajo, incluidas las reclamaciones de salarios y demás cantidades adeudadas por el empresario. La Ley Orgánica 1/2025, de 2 de enero, establece la nueva nomenclatura de los órganos judiciales, transformando los Juzgados de lo Social en Tribunales de Instancia, Sección Social, conforme a su Disposición adicional primera y Disposición transitoria primera.",
    "segundo": "Artículos 26 a 29 del Real Decreto Legislativo 2/2015, de 23 de octubre, por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores. Especialmente el artículo 26 que establece el derecho del trabajador a percibir puntualmente su salario, el artículo 27 sobre la estructura del salario, el artículo 28 sobre la forma y tiempo del pago, y el artículo 29 que regula los intereses de demora en el pago de salarios, estableciendo un interés del 10% anual sobre las cantidades adeudadas.",
    "tercero": "Convenio Colectivo de aplicación [ESPECIFICAR CONVENIO SI SE PROPORCIONA], que establece las condiciones salariales y laborales aplicables a la relación laboral, así como la Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad en las operaciones comerciales, aplicable por analogía a las relaciones laborales según la jurisprudencia del Tribunal Supremo.",
    "cuarto": "Jurisprudencia del Tribunal Supremo, especialmente las Sentencias de 15 de febrero de 2010 (RJ 2010/1234), 20 de marzo de 2015 (RJ 2015/2345) y 10 de noviembre de 2018 (RJ 2018/5678), que han establecido de forma reiterada el derecho del trabajador a reclamar el pago de cantidades adeudadas con los intereses de demora correspondientes, así como los artículos 1101 y 1108 del Código Civil sobre el cumplimiento de obligaciones y la mora del deudor."
  },
  "petitorio": {
    "cantidadReclamada": "string",
    "intereses": true,
    "lugar": "string",
    "fecha": "string"
  },
  "otrosi": {
    "asistenciaLetrada": true,
    "mediosPrueba": {
      "documental": [
        "Nóminas acreditativas del salario percibido en los últimos doce meses",
        "Contrato de trabajo"
      ],
      "interrogatorio": "string"
    }
  }
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;

export function buildUserPrompt(data: any, userProfile?: any): string {
  // Helper para obtener nombre completo de forma segura
  const getFullName = () => {
    if (userProfile?.displayName) return userProfile.displayName;
    if (userProfile?.profile?.firstName && userProfile?.profile?.lastName) {
      return `${userProfile.profile.firstName} ${userProfile.profile.lastName}`;
    }
    return 'No disponible';
  };

  // Helper para obtener país de forma segura
  const getCountry = () => {
    return userProfile?.profile?.country || 'España';
  };

  const userDataSection = userProfile ? `
DATOS DEL PERFIL DEL USUARIO (si están disponibles, úsalos para completar información faltante):
- Nombre completo: ${getFullName()}
- Email: ${userProfile.email || 'No disponible'}
- Teléfono: ${userProfile.profile?.phone || 'No disponible'}
- País: ${userProfile.profile?.country || 'España'}
- Despacho/Bufete: ${userProfile.profile?.firm || 'No disponible'}
` : '';

  return `Genera una RECLAMACIÓN DE CANTIDADES laboral profesional y completa con los siguientes datos:

DATOS DEL TRABAJADOR:
- Nombre: ${data.nombreTrabajador || userProfile?.displayName || 'No especificado'}
- DNI: ${data.dniTrabajador || 'No especificado'}
- Domicilio: ${data.domicilioTrabajador || (userProfile?.profile?.country ? `España, ${userProfile.profile?.country}` : 'No especificado')}
- Teléfono: ${data.telefonoTrabajador || userProfile?.profile?.phone || 'No especificado'}
- Email: ${userProfile?.email || data.emailTrabajador || 'No especificado'}

DATOS DE LA EMPRESA:
- Nombre: ${data.nombreEmpresa || 'No especificado'}
- CIF: ${data.cifEmpresa || 'No especificado'}
- Domicilio: ${data.domicilioEmpresa || 'No especificado'}

DATOS LABORALES:
- Tipo de contrato: ${data.tipoContrato || 'indefinido'}
- Jornada: ${data.jornada || 'completa'}
- Tareas: ${data.tareas || 'No especificadas'}
- Antigüedad: ${data.antiguedad || 'No especificada'}
- Salario: ${data.salario || 'No especificado'}
- Convenio: ${data.convenio || 'No especificado'}

CANTIDADES ADEUDADAS:
${data.cantidadesAdeudadas ? data.cantidadesAdeudadas.map((cantidad: string, index: number) => `- ${cantidad}`).join('\n') : '- No especificadas'}

CONCILIACIÓN:
- Fecha papeleta: ${data.fechaPapeleta || 'No especificada'}
- Fecha conciliación: ${data.fechaConciliacion || 'No especificada'}
- Resultado: ${data.resultadoConciliacion || 'SIN ACUERDO'}

CANTIDAD TOTAL RECLAMADA: ${data.cantidadTotal || 'No especificada'}

LOCALIDAD: ${data.localidad || 'Madrid'}

${userDataSection}

INSTRUCCIONES ESPECIALES:
- Incluye referencias específicas a artículos de leyes españolas (LJS, ET, Código Civil)
- Menciona jurisprudencia relevante del Tribunal Supremo cuando sea apropiado
- Usa terminología legal profesional española
- El documento debe ser completo, profesional y listo para presentar ante el Juzgado de lo Social
- Los fundamentos de derecho deben ser detallados y específicos, NO genéricos
- CRÍTICO: Los fundamentos deben incluir explicaciones completas de cada artículo mencionado, no solo el número del artículo
- CRÍTICO: Cada fundamento debe tener al menos 2-3 oraciones explicando por qué se aplica ese artículo a este caso
- CRÍTICO: Incluye referencias a jurisprudencia específica del Tribunal Supremo con fechas y números de sentencias cuando sea relevante
- CRÍTICO: Los fundamentos deben ser similares al ejemplo proporcionado en el SYSTEM_PROMPT, con explicaciones detalladas

STRICT JSON ONLY - Genera el documento completo en formato JSON válido con TODOS los campos requeridos.`;
}


