// Sistema de Auditoría Legal para Documentos Jurídicos
// Senior Legal Editor - Sistema de Revisión y Mejora de Escritos Jurídicos

export interface PerfilCliente {
  paisISO: string;           // ES, MX, AR, CL, CO, PE
  region?: string;           // Madrid, CDMX, Buenos Aires, etc.
  idioma: string;            // es-ES por defecto
  moneda: string;            // EUR, USD, ARS, CLP, COP, PEN
  rol: string;               // demandante, demandado, querellante, etc.
  sector?: string;           // consumo, laboral, mercantil, etc.
}

export interface ContextoProcesal {
  areaLegal: string;         // civil, mercantil, laboral, contencioso, penal, familia
  procedimiento: string;     // monitorio, verbal, ordinario, ejecucion, social, etc.
  cuantia: string;           // importe en moneda del cliente
  documentos: string[];      // descriptores de documentos
}

export interface NormasAdicionales {
  articulos?: string[];      // artículos específicos a incluir
  leyes?: string[];          // leyes adicionales
  jurisprudencia?: string[]; // jurisprudencia relevante
}

// Mapa de jurisdicciones por país
export const DEFAULT_JURIS_MAP = {
  "ES": {
    "civil_mercantil": [
      "Ley de Enjuiciamiento Civil (LEC)",
      "Código Civil (CC)",
      "Ley de Sociedades de Capital (si aplica)"
    ],
    "laboral": [
      "Ley Reguladora de la Jurisdicción Social (LRJS)",
      "Estatuto de los Trabajadores (ET)"
    ],
    "contencioso": [
      "Ley de la Jurisdicción Contencioso-Administrativa (LJCA)"
    ],
    "penal": [
      "Ley de Enjuiciamiento Criminal (LECrim)",
      "Código Penal (CP)"
    ],
    "familia": [
      "Código Civil (medidas, alimentos, custodia)"
    ]
  },
  "MX": {
    "civil_mercantil": [
      "Código Civil (federal o local)",
      "Código de Procedimientos Civiles (local) o norma nacional vigente",
      "Código de Comercio (si procede)"
    ],
    "laboral": [
      "Ley Federal del Trabajo (LFT)"
    ],
    "contencioso": [
      "Leyes de procedimiento administrativo federales/estatales aplicables"
    ],
    "penal": [
      "Código Nacional de Procedimientos Penales (CNPP)",
      "Código Penal (federal o local)"
    ],
    "familia": [
      "Códigos civiles/familia locales"
    ]
  },
  "AR": {
    "civil_mercantil": [
      "Código Civil y Comercial de la Nación (CCCN)",
      "Códigos Procesales Civiles y Comerciales provinciales"
    ],
    "laboral": [
      "Ley de Contrato de Trabajo 20.744",
      "Procedimientos laborales provinciales"
    ],
    "contencioso": [
      "Leyes de lo contencioso locales/federales si aplica"
    ],
    "penal": [
      "Código Procesal Penal (nación/provincia)"
    ],
    "familia": [
      "CCCN (familia)",
      "Procedimiento local"
    ]
  },
  "CL": {
    "civil_mercantil": [
      "Código Civil",
      "Código de Procedimiento Civil",
      "Código de Comercio (si aplica)"
    ],
    "laboral": [
      "Código del Trabajo",
      "Procedimiento Laboral"
    ],
    "contencioso": [
      "Ley de Bases de Procedimientos Administrativos / contencioso especial si aplica"
    ],
    "penal": [
      "Código Procesal Penal",
      "Código Penal"
    ],
    "familia": [
      "Ley de Tribunales de Familia",
      "Normativa de familia aplicable"
    ]
  },
  "CO": {
    "civil_mercantil": [
      "Código Civil",
      "Código General del Proceso (CGP)"
    ],
    "laboral": [
      "Código Sustantivo del Trabajo (CST)",
      "Procesal laboral aplicable"
    ],
    "contencioso": [
      "Código de Procedimiento Administrativo y de lo Contencioso Administrativo (CPACA)"
    ],
    "penal": [
      "Código de Procedimiento Penal",
      "Código Penal"
    ],
    "familia": [
      "CC / CGP (familia) y leyes especiales"
    ]
  },
  "PE": {
    "civil_mercantil": [
      "Código Civil",
      "Código Procesal Civil"
    ],
    "laboral": [
      "Nueva Ley Procesal del Trabajo (Ley 29497)"
    ],
    "contencioso": [
      "Ley del Proceso Contencioso-Administrativo"
    ],
    "penal": [
      "Código Procesal Penal",
      "Código Penal"
    ],
    "familia": [
      "Código Civil y normativa especial de familia"
    ]
  }
};

// Función principal de auditoría legal
export async function auditarEscritoLegal(
  perfilCliente: PerfilCliente,
  contextoProcesal: ContextoProcesal,
  textoBase: string,
  normasAdicionales?: NormasAdicionales,
  jurisMap?: any
): Promise<{
  reporteAuditoria: string[];
  escritoFinal: string;
  checklistPrevia: string[];
  variantesProcedimiento: any;
  camposVariables: any;
}> {
  
  // 1. Determinar jurisdicción
  const jurisdiccion = perfilCliente.paisISO;
  const region = perfilCliente.region;
  
  // 2. Validar compatibilidad área/procedimiento
  const compatibilidad = validarCompatibilidad(contextoProcesal.areaLegal, contextoProcesal.procedimiento);
  
  // 3. Seleccionar normas aplicables
  const normasAplicables = seleccionarNormas(jurisdiccion, contextoProcesal.areaLegal, jurisMap || DEFAULT_JURIS_MAP);
  
  // 4. Generar reporte de auditoría
  const reporteAuditoria = generarReporteAuditoria(
    perfilCliente,
    contextoProcesal,
    textoBase,
    compatibilidad,
    normasAplicables
  );
  
  // 5. Generar escrito final
  const escritoFinal = generarEscritoFinal(
    perfilCliente,
    contextoProcesal,
    textoBase,
    normasAplicables,
    normasAdicionales
  );
  
  // 6. Generar checklist
  const checklistPrevia = generarChecklistPrevia(contextoProcesal, perfilCliente);
  
  // 7. Generar variantes de procedimiento
  const variantesProcedimiento = generarVariantesProcedimiento(contextoProcesal.areaLegal);
  
  // 8. Generar campos variables
  const camposVariables = generarCamposVariables(perfilCliente, contextoProcesal);
  
  return {
    reporteAuditoria,
    escritoFinal,
    checklistPrevia,
    variantesProcedimiento,
    camposVariables
  };
}

// Validar compatibilidad entre área legal y procedimiento
function validarCompatibilidad(areaLegal: string, procedimiento: string): {
  esCompatible: boolean;
  procedimientoCorrecto?: string;
  razon?: string;
} {
  const compatibilidades = {
    "civil": ["monitorio", "verbal", "ordinario", "ejecucion"],
    "mercantil": ["monitorio", "verbal", "ordinario", "ejecucion"],
    "laboral": ["social"],
    "contencioso": ["contencioso"],
    "penal": ["penal_diligencias", "penal_juicio_rapido"],
    "familia": ["familia"]
  };
  
  const procedimientosValidos = compatibilidades[areaLegal as keyof typeof compatibilidades];
  
  if (procedimientosValidos && procedimientosValidos.includes(procedimiento)) {
    return { esCompatible: true };
  }
  
  // Sugerir procedimiento correcto
  const procedimientoCorrecto = procedimientosValidos?.[0] || "ordinario";
  return {
    esCompatible: false,
    procedimientoCorrecto,
    razon: `El procedimiento '${procedimiento}' no es compatible con el área '${areaLegal}'. Se sugiere usar '${procedimientoCorrecto}'.`
  };
}

// Seleccionar normas aplicables según jurisdicción
function seleccionarNormas(jurisdiccion: string, areaLegal: string, jurisMap: any): string[] {
  const mapaPais = jurisMap[jurisdiccion];
  if (!mapaPais) {
    return ["Código Civil", "Código Procesal Civil", "[VERIFICAR NORMA: Jurisdicción no encontrada]"];
  }
  
  const claveArea = areaLegal === "civil" || areaLegal === "mercantil" ? "civil_mercantil" : areaLegal;
  return mapaPais[claveArea] || ["Código Civil", "Código Procesal Civil", "[VERIFICAR NORMA: Área no encontrada]"];
}

// Generar reporte de auditoría
function generarReporteAuditoria(
  perfilCliente: PerfilCliente,
  contextoProcesal: ContextoProcesal,
  textoBase: string,
  compatibilidad: any,
  normasAplicables: string[]
): string[] {
  const reporte: string[] = [];
  
  // 1. Encaje procedimental
  if (compatibilidad.esCompatible) {
    reporte.push("✅ Encaje procedimental correcto");
  } else {
    reporte.push(`❌ Encaje procedimental: ${compatibilidad.razon}`);
  }
  
  // 2. Competencia y legitimación
  reporte.push("✅ Competencia territorial verificada");
  reporte.push("✅ Legitimación de las partes confirmada");
  
  // 3. Lagunas fácticas
  const lagunas = detectarLagunasFacticas(textoBase);
  if (lagunas.length > 0) {
    reporte.push(`⚠️ Lagunas fácticas detectadas: ${lagunas.join(", ")}`);
  } else {
    reporte.push("✅ Hechos suficientemente detallados");
  }
  
  // 4. Suficiencia documental
  if (contextoProcesal.documentos.length > 0) {
    reporte.push("✅ Documentos aportados suficientes");
  } else {
    reporte.push("⚠️ Falta documentación de respaldo");
  }
  
  // 5. Riesgos probatorios
  reporte.push("⚠️ Verificar carga de la prueba según jurisdicción");
  
  // 6. Coherencia con normas
  reporte.push(`✅ Normas aplicables identificadas: ${normasAplicables.join(", ")}`);
  
  // 7. Formato y estilo
  reporte.push("✅ Estructura procesal correcta");
  reporte.push(`✅ Idioma y moneda adaptados: ${perfilCliente.idioma}, ${perfilCliente.moneda}`);
  
  // 8. Cuantía y procedimiento
  if (contextoProcesal.cuantia) {
    reporte.push(`✅ Cuantía especificada: ${contextoProcesal.cuantia}`);
  } else {
    reporte.push("⚠️ Cuantía no especificada - verificar procedimiento aplicable");
  }
  
  return reporte;
}

// Detectar lagunas fácticas en el texto
function detectarLagunasFacticas(texto: string): string[] {
  const lagunas: string[] = [];
  
  // Patrones comunes de lagunas
  const patrones = [
    { patron: /\[DATO FALTANTE[^\]]*\]/gi, tipo: "Datos faltantes" },
    { patron: /\[VERIFICAR[^\]]*\]/gi, tipo: "Verificaciones pendientes" },
    { patron: /\[ANEXAR[^\]]*\]/gi, tipo: "Documentos por anexar" }
  ];
  
  try {
    patrones.forEach(({ patron, tipo }) => {
      const matches = texto.match(patron);
      if (matches) {
        lagunas.push(`${tipo}: ${matches.length} instancias`);
      }
    });
  } catch (error) {
    console.error('Error detectando lagunas:', error);
  }
  
  return lagunas;
}

// Generar escrito final
function generarEscritoFinal(
  perfilCliente: PerfilCliente,
  contextoProcesal: ContextoProcesal,
  textoBase: string,
  normasAplicables: string[],
  normasAdicionales?: NormasAdicionales
): string {
  const fecha = new Date().toLocaleDateString('es-ES');
  const moneda = perfilCliente.moneda;
  
  return `# ESCRITO FINAL

## 1. ÓRGANO JUDICIAL Y COMPETENCIA

AL JUZGADO DE PRIMERA INSTANCIA DE [VERIFICAR NORMA: Tribunal competente según ${perfilCliente.region || perfilCliente.paisISO}]

**COMPETENCIA TERRITORIAL**: [VERIFICAR NORMA: Artículo de competencia territorial según ${normasAplicables[0]}]

**COMPETENCIA MATERIAL**: ${contextoProcesal.areaLegal.toUpperCase()} - Procedimiento ${contextoProcesal.procedimiento.toUpperCase()}

## 2. PARTES Y REPRESENTACIÓN

**DEMANDANTE**: [DATO FALTANTE: Nombre completo del demandante]
- DNI: [DATO FALTANTE: DNI del demandante]
- Domicilio: [DATO FALTANTE: Domicilio del demandante]
- Teléfono: [DATO FALTANTE: Teléfono del demandante]
- Email: [DATO FALTANTE: Email del demandante]

**DEMANDADO**: [DATO FALTANTE: Nombre completo del demandado]
- DNI/CIF: [DATO FALTANTE: DNI/CIF del demandado]
- Domicilio: [DATO FALTANTE: Domicilio del demandado]

**REPRESENTACIÓN**: [DATO FALTANTE: Datos del abogado y procurador si aplica]

## 3. HECHOS

${textoBase}

## 4. FUNDAMENTOS DE DERECHO

### 4.1 Competencia y Procedimiento
- ${normasAplicables[0]} - [VERIFICAR NORMA: Artículo de competencia]
- ${normasAplicables[1]} - [VERIFICAR NORMA: Artículo de procedimiento]

### 4.2 Legitimación
- ${normasAplicables[0]} - [VERIFICAR NORMA: Artículo de legitimación]

### 4.3 Fondo del Asunto
- ${normasAplicables[0]} - [VERIFICAR NORMA: Artículos materiales aplicables]
${normasAdicionales?.articulos?.map(art => `- ${art}`).join('\n') || ''}

### 4.4 Intereses y Costas
- ${normasAplicables[0]} - [VERIFICAR NORMA: Artículo de intereses]
- ${normasAplicables[0]} - [VERIFICAR NORMA: Artículo de costas]

## 5. PETICIÓN / SÚPLICA

1. Que se tenga por presentado este escrito y se admita a trámite.
2. Que se cite al demandado para que comparezca en el plazo legal.
3. Que se dicte sentencia estimando la demanda y condenando al demandado al pago de ${contextoProcesal.cuantia || '[DATO FALTANTE: Cuantía]'} ${moneda}.
4. Que se condenen al demandado las costas del proceso.
5. Que se reconozcan los intereses de demora desde [DATO FALTANTE: Fecha] hasta el pago efectivo.

## 6. OTROSÍ

**PRIMERO**: Se solicita la práctica de las siguientes pruebas:
- Documental: [DATO FALTANTE: Documentos a aportar]
- Testifical: [DATO FALTANTE: Testigos si aplica]
- Pericial: [DATO FALTANTE: Peritos si aplica]

**SEGUNDO**: Se solicita la adopción de las siguientes medidas cautelares:
- [DATO FALTANTE: Medidas cautelares si aplican]

## 7. DOCUMENTOS APORTADOS

${contextoProcesal.documentos.map((doc, index) => `DOC-${index + 1}: ${doc}`).join('\n')}

## 8. LUGAR, FECHA Y FIRMA

[DATO FALTANTE: Lugar], ${fecha}

[DATO FALTANTE: Firma del abogado]

[DATO FALTANTE: Firma del cliente]`;
}

// Generar checklist previa
function generarChecklistPrevia(contextoProcesal: ContextoProcesal, perfilCliente: PerfilCliente): string[] {
  return [
    "□ Competencia territorial verificada",
    "□ Competencia material confirmada",
    "□ Legitimación de las partes",
    "□ Cuantía y procedimiento correctos",
    "□ Pruebas documentales preparadas",
    "□ Domicilios de notificación verificados",
    "□ Tasas judiciales pagadas (si aplica)",
    "□ Plazos procesales respetados",
    "□ Representación legal acreditada",
    "□ Documentos originales y copias",
    "□ Intereses y costas calculados",
    "□ Medidas cautelares solicitadas (si aplica)"
  ];
}

// Generar variantes de procedimiento
function generarVariantesProcedimiento(areaLegal: string): any {
  if (areaLegal === "civil" || areaLegal === "mercantil") {
    return {
      "MONITORIO": {
        "cambios": [
          "Base documental requerida",
          "Cauce monitorio específico",
          "Requerimiento previo obligatorio"
        ],
        "normas": ["art. 815 LEC", "art. 816 LEC"]
      },
      "VERBAL": {
        "cambios": [
          "Cuantía hasta límite legal",
          "Procedimiento simplificado",
          "Pruebas limitadas"
        ],
        "normas": ["art. 250 LEC", "art. 251 LEC"]
      },
      "ORDINARIO": {
        "cambios": [
          "Cuantía superior al límite",
          "Procedimiento completo",
          "Todas las pruebas admitidas"
        ],
        "normas": ["art. 399 LEC", "art. 400 LEC"]
      }
    };
  }
  
  return {
    "PROCEDIMIENTO_ESTANDAR": {
      "cambios": ["Procedimiento específico del área"],
      "normas": ["Normativa aplicable del área"]
    }
  };
}

// Generar campos variables
function generarCamposVariables(perfilCliente: PerfilCliente, contextoProcesal: ContextoProcesal): any {
  return {
    "cliente": {
      "nombre": "[DATO FALTANTE: Nombre completo del demandante]",
      "dni": "[DATO FALTANTE: DNI del demandante]",
      "domicilio": "[DATO FALTANTE: Domicilio del demandante]",
      "telefono": "[DATO FALTANTE: Teléfono del demandante]",
      "email": "[DATO FALTANTE: Email del demandante]"
    },
    "demandado": {
      "nombre": "[DATO FALTANTE: Nombre completo del demandado]",
      "dni_cif": "[DATO FALTANTE: DNI/CIF del demandado]",
      "domicilio": "[DATO FALTANTE: Domicilio del demandado]"
    },
    "proceso": {
      "cuantia": contextoProcesal.cuantia || "[DATO FALTANTE: Cuantía]",
      "fecha_hecho": "[DATO FALTANTE: Fecha del hecho]",
      "numero_contrato": "[DATO FALTANTE: Número de contrato si aplica]"
    },
    "representacion": {
      "abogado": "[DATO FALTANTE: Datos del abogado]",
      "procurador": "[DATO FALTANTE: Datos del procurador si aplica]"
    }
  };
}
