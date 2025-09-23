import { ReclamacionCantidadRequest } from '../validate-reclamacion';

export const SYSTEM_PROMPT = `
Eres abogado procesal civil en España. Vas a elaborar un borrador profesional de "reclamación de cantidad" listo para PDF y presentación. 
NUNCA inventes hechos ni cifras. Si faltan datos, escribe [DATO FALTANTE].
Lenguaje: Español (España).

OBJETIVO
- Devuelve EXCLUSIVAMENTE un JSON con el esquema pactado (MODEL_OUTPUT). Nada de markdown.
- Recomienda el cauce procedimental y construye el escrito con secciones claras y numeradas.

REGLAS JURÍDICAS (España)
- Monitorio: deuda dineraria líquida, determinada, vencida y exigible con soporte documental; indicar arts. 812 y ss. LEC; competencia monitorio: art. 813 LEC (JPI del domicilio del deudor) y especialidad en gastos de comunidad si aplica. La petición inicial del monitorio NO exige abogado/procurador: art. 814.2 LEC.
- Verbal: si no procede monitorio o por razón de cuantía/objeto; defensa letrada NO preceptiva cuando el verbal es por cuantía ≤ 2.000 €: art. 31.2 LEC (cítalo como nota pro se). Advierte que por razón de materia puede ser preceptiva (deja [VERIFICAR NORMA] si hay duda).
- Competencia territorial general: art. 50 LEC (persona física) y art. 51 LEC (persona jurídica). Si hay cláusula de sumisión o fueros imperativos (art. 54 y 52 LEC), indicarlo o marcar [VERIFICAR NORMA].
- Intereses: art. 1108 CC (mora dineraria) y 1109 CC (intereses vencidos desde reclamación judicial).
- Costas: art. 394 LEC (vencimiento objetivo con matices); no transcribas, solo cita.

ESTILO Y ESTRUCTURA DEL ESCRITO
- Encabezado (Juzgado/competencia), Partes, HECHOS (numerados y fechados), FUNDAMENTOS (subapartados: competencia/procedimiento; legitimación; fondo; intereses y costas), SÚPLICA (numerada), OTROSÍ (prueba, requerimientos), DOCUMENTOS, LUGAR/FECHA/FIRMA.
- Claro, sobrio, sin retórica. Español de España. Números con formato europeo (1.234,56 €).
- Incluye "notasProSe" con pautas prácticas (p.ej. presentación en sede judicial, formulario monitorio, copias y anexos).

POLÍTICA DE INCERTIDUMBRE
- Si el input no permite elegir con certeza MONITORIO vs VERBAL, recomienda con "cauceRecomendado: verbal" y añade nota en "notasProSe" sobre monitorio alternativo.

OUTPUT
- Devuelve SOLO el JSON conforme al esquema MODEL_OUTPUT.`;

export function buildUserPrompt(payload: ReclamacionCantidadRequest): string {
  // Calcular cuantía y precisión desde OCR
  const cuantia = payload.cuantiaOverride || calcularCuantiaDesdeOCR(payload.ocr);
  const precision = calcularPrecisionDesdeOCR(payload.ocr);
  
  // Resumen de documentos OCR
  const documentosInfo = payload.ocr.files.length > 0 
    ? `\nDocumentos analizados por OCR (${payload.ocr.files.length} archivos, precisión media: ${precision}%):\n${payload.ocr.files.map(doc => {
        const amounts = doc.amounts?.map(a => `${a.value} ${a.currency}`).join(', ') || 'Sin cantidades detectadas';
        return `- ${doc.filename} (${doc.docType || 'tipo no detectado'}): ${amounts}${doc.dateISO ? ` - Fecha: ${doc.dateISO}` : ''}`;
      }).join('\n')}`
    : '';

  // Generar hechos desde OCR si no se proporcionan
  const hechos = payload.hechos || generarHechosDesdeOCR(payload.ocr);
  
  // Generar base negocial desde OCR si no se proporciona
  const baseNegocial = payload.base_negocial || generarBaseNegocialDesdeOCR(payload.ocr);

  return `
DATOS
Acreedor: ${payload.acreedor.nombre} (${payload.acreedor.nif || "[DNI/NIE]"}), domicilio: ${payload.acreedor.domicilio || "[DOMICILIO]"}
Deudor: ${payload.deudor.nombre} (${payload.deudor.nif || "[DNI/NIE]"}), domicilio: ${payload.deudor.domicilio || "[DOMICILIO]"}
Cuantía principal: ${cuantia} EUR (${payload.cuantiaOverride ? 'editada por usuario' : 'detectada por OCR'})
Base negocial: ${baseNegocial}
Hechos resumidos: ${hechos}
Documentos: ${payload.docs.join("; ")}${documentosInfo}
Intereses: ${JSON.stringify(payload.intereses || {})}
Vía preferida: ${payload.viaPreferida}
Plaza: ${payload.plaza || "[CIUDAD]"}
Idioma: ${payload.idioma}

TAREA
1) Recomienda MONITORIO o VERBAL conforme a LEC/CC.
2) Construye el escrito completo (todas las secciones).
3) Llena "notasProSe" explicando si puede presentarse sin abogado/procurador y cómo.
4) Devuelve SOLO el JSON.`;
}

// Función para calcular cuantía desde OCR
function calcularCuantiaDesdeOCR(ocr: any): number {
  if (ocr.summary?.totalDetected) {
    return ocr.summary.totalDetected;
  }
  
  // Sumar todas las cantidades detectadas en los archivos
  let total = 0;
  ocr.files.forEach((file: any) => {
    if (file.amounts) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          total += amount.value;
        }
      });
    }
  });
  
  return total > 0 ? total : 0;
}

// Función para calcular precisión desde OCR
function calcularPrecisionDesdeOCR(ocr: any): number {
  if (ocr.summary?.confidence) {
    return Math.round(ocr.summary.confidence * 100);
  }
  
  // Calcular media ponderada por valor de las confianzas
  let totalValue = 0;
  let weightedConfidence = 0;
  
  ocr.files.forEach((file: any) => {
    if (file.amounts && file.amounts.length > 0) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          const confidence = amount.confidence || file.confidence || 0.6;
          totalValue += amount.value;
          weightedConfidence += amount.value * confidence;
        }
      });
    }
  });
  
  if (totalValue > 0) {
    return Math.round((weightedConfidence / totalValue) * 100);
  }
  
  return 60; // Precisión por defecto
}

// Función para generar hechos desde OCR
function generarHechosDesdeOCR(ocr: any): string {
  const fechas = ocr.files
    .map((file: any) => file.dateISO)
    .filter(Boolean)
    .sort();
  
  const cantidades = ocr.files
    .flatMap((file: any) => file.amounts || [])
    .filter((amount: any) => amount.value > 0);
  
  let hechos = "Según los documentos aportados";
  
  if (fechas.length > 0) {
    hechos += `, con fecha de ${fechas[0]}`;
  }
  
  if (cantidades.length > 0) {
    const total = cantidades.reduce((sum: number, amount: any) => sum + amount.value, 0);
    hechos += `, se adeuda la cantidad de ${total.toLocaleString('es-ES')} euros`;
  }
  
  hechos += ". [DATO FALTANTE: Detalles específicos del incumplimiento]";
  
  return hechos;
}

// Función para generar base negocial desde OCR
function generarBaseNegocialDesdeOCR(ocr: any): string {
  const tipos = ocr.files.map((file: any) => file.docType).filter(Boolean);
  
  if (tipos.length > 0) {
    const tiposUnicos = [...new Set(tipos)];
    return tiposUnicos.join(', ');
  }
  
  return "[DATO FALTANTE: Base negocial]";
}

// Función para determinar si procede monitorio
export function puedeSerMonitorio(payload: ReclamacionCantidadRequest): boolean {
  // Monitorio requiere: deuda dineraria, líquida, determinada, vencida y exigible
  const tieneDocumentos = (payload.docs && payload.docs.length > 0) || 
                         (payload.documentosOCR && payload.documentosOCR.length > 0);
  
  const cuantiaValida = payload.cuantia > 0;
  
  // Si hay documentos OCR con alta precisión, es más probable que proceda monitorio
  const documentosConfiables = payload.documentosOCR?.some(doc => doc.precision >= 80) || false;
  
  return tieneDocumentos && cuantiaValida && (documentosConfiables || payload.docs.length > 0);
}

// Función para determinar si puede ser pro se
export function puedeSerProSe(payload: ReclamacionCantidadRequest, cauceRecomendado: 'monitorio' | 'verbal'): boolean {
  if (cauceRecomendado === 'monitorio') {
    // Monitorio: art. 814.2 LEC - NO exige abogado/procurador
    return true;
  }
  
  if (cauceRecomendado === 'verbal') {
    // Verbal: art. 31.2 LEC - NO exige abogado si cuantía ≤ 2.000€
    return payload.cuantia <= 2000;
  }
  
  return false;
}
