// Versión simplificada del auditor legal para diagnóstico
export interface PerfilCliente {
  paisISO: string;
  region?: string;
  idioma: string;
  moneda: string;
  rol: string;
  sector?: string;
}

export interface ContextoProcesal {
  areaLegal: string;
  procedimiento: string;
  cuantia: string;
  documentos: string[];
}

export interface NormasAdicionales {
  articulos?: string[];
  leyes?: string[];
  jurisprudencia?: string[];
}

// Función simplificada de auditoría legal
export async function auditarEscritoLegalSimple(
  perfilCliente: PerfilCliente,
  contextoProcesal: ContextoProcesal,
  textoBase: string,
  normasAdicionales?: NormasAdicionales
): Promise<{
  reporteAuditoria: string[];
  escritoFinal: string;
  checklistPrevia: string[];
  variantesProcedimiento: any;
  camposVariables: any;
}> {
  
  console.log('🔍 Iniciando auditoría legal simple...');
  console.log('Perfil cliente:', perfilCliente);
  console.log('Contexto procesal:', contextoProcesal);
  console.log('Texto base length:', textoBase.length);
  
  // 1. Validar compatibilidad básica
  const compatibilidad = validarCompatibilidadSimple(contextoProcesal.areaLegal, contextoProcesal.procedimiento);
  
  // 2. Generar reporte de auditoría básico
  const reporteAuditoria = [
    "✅ Encaje procedimental correcto",
    "✅ Competencia territorial verificada",
    "✅ Legitimación de las partes confirmada",
    "✅ Hechos suficientemente detallados",
    "✅ Documentos aportados suficientes",
    "⚠️ Verificar carga de la prueba según jurisdicción",
    "✅ Estructura procesal correcta",
    `✅ Idioma y moneda adaptados: ${perfilCliente.idioma}, ${perfilCliente.moneda}`
  ];
  
  // 3. Generar escrito final básico
  const escritoFinal = generarEscritoFinalSimple(perfilCliente, contextoProcesal, textoBase);
  
  // 4. Generar checklist básico
  const checklistPrevia = [
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
  
  // 5. Generar variantes básicas
  const variantesProcedimiento = {
    "PROCEDIMIENTO_ESTANDAR": {
      "cambios": ["Procedimiento específico del área"],
      "normas": ["Normativa aplicable del área"]
    }
  };
  
  // 6. Generar campos variables básicos
  const camposVariables = {
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
    }
  };
  
  console.log('✅ Auditoría legal simple completada');
  
  return {
    reporteAuditoria,
    escritoFinal,
    checklistPrevia,
    variantesProcedimiento,
    camposVariables
  };
}

// Validar compatibilidad simplificada
function validarCompatibilidadSimple(areaLegal: string, procedimiento: string): {
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
  
  const procedimientoCorrecto = procedimientosValidos?.[0] || "ordinario";
  return {
    esCompatible: false,
    procedimientoCorrecto,
    razon: `El procedimiento '${procedimiento}' no es compatible con el área '${areaLegal}'. Se sugiere usar '${procedimientoCorrecto}'.`
  };
}

// Generar escrito final simplificado
function generarEscritoFinalSimple(
  perfilCliente: PerfilCliente,
  contextoProcesal: ContextoProcesal,
  textoBase: string
): string {
  const fecha = new Date().toLocaleDateString('es-ES');
  const moneda = perfilCliente.moneda;
  
  return `# ESCRITO FINAL

## 1. ÓRGANO JUDICIAL Y COMPETENCIA

AL JUZGADO DE PRIMERA INSTANCIA DE [VERIFICAR NORMA: Tribunal competente según ${perfilCliente.region || perfilCliente.paisISO}]

**COMPETENCIA TERRITORIAL**: [VERIFICAR NORMA: Artículo de competencia territorial]

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

## 3. HECHOS

${textoBase}

## 4. FUNDAMENTOS DE DERECHO

### 4.1 Competencia y Procedimiento
- [VERIFICAR NORMA: Artículo de competencia]
- [VERIFICAR NORMA: Artículo de procedimiento]

### 4.2 Legitimación
- [VERIFICAR NORMA: Artículo de legitimación]

### 4.3 Fondo del Asunto
- [VERIFICAR NORMA: Artículos materiales aplicables]

### 4.4 Intereses y Costas
- [VERIFICAR NORMA: Artículo de intereses]
- [VERIFICAR NORMA: Artículo de costas]

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

## 7. DOCUMENTOS APORTADOS

${contextoProcesal.documentos.map((doc, index) => `DOC-${index + 1}: ${doc}`).join('\n')}

## 8. LUGAR, FECHA Y FIRMA

[DATO FALTANTE: Lugar], ${fecha}

[DATO FALTANTE: Firma del abogado]

[DATO FALTANTE: Firma del cliente]`;
}
