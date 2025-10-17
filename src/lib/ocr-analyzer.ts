import { createWorker } from 'tesseract.js';
import { DocumentoOCR, DocumentoOCRSchema } from './validate-reclamacion';

export interface OCRResult {
  contenido: string;
  precision: number;
  cantidadDetectada?: number;
  fechaDetectada?: string;
  tipoDocumento?: 'factura' | 'albaran' | 'contrato' | 'presupuesto' | 'otro';
}

export async function analyzeDocumentOCR(fileBuffer: Buffer, filename: string): Promise<OCRResult> {
  const worker = await createWorker('spa'); // Español
  
  try {
    const { data: { text, confidence } } = await worker.recognize(fileBuffer);
    
    // Procesar el texto extraído
    const contenido = text.trim();
    const precision = Math.round(confidence);
    
    // Detectar cantidad monetaria
    const cantidadDetectada = detectarCantidad(contenido);
    
    // Detectar fecha
    const fechaDetectada = detectarFecha(contenido);
    
    // Detectar tipo de documento
    const tipoDocumento = detectarTipoDocumento(contenido, filename);
    
    return {
      contenido,
      precision,
      cantidadDetectada,
      fechaDetectada,
      tipoDocumento
    };
    
  } finally {
    await worker.terminate();
  }
}

function detectarCantidad(texto: string): number | undefined {
  // Patrones para detectar cantidades monetarias
  const patrones = [
    /(?:total|importe|cantidad|precio|coste)[\s:]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€?/gi,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€/gi,
    /€\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi
  ];
  
  for (const patron of patrones) {
    const matches = [...texto.matchAll(patron)];
    if (matches.length > 0) {
      // Tomar la cantidad más alta encontrada
      const cantidades = matches.map(match => {
        const cantidad = match[1].replace(/[.,]/g, '');
        return parseFloat(cantidad.replace(/(\d{3})$/, '.$1'));
      });
      
      return Math.max(...cantidades);
    }
  }
  
  return undefined;
}

function detectarFecha(texto: string): string | undefined {
  // Patrones para detectar fechas
  const patrones = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{2,4})/gi,
    /(\d{1,2})\s+(\w+)\s+(\d{2,4})/gi
  ];
  
  for (const patron of patrones) {
    const match = patron.exec(texto);
    if (match) {
      return match[0];
    }
  }
  
  return undefined;
}

function detectarTipoDocumento(contenido: string, filename: string): 'factura' | 'albaran' | 'contrato' | 'presupuesto' | 'otro' {
  const texto = (contenido + ' ' + filename).toLowerCase();
  
  // Palabras clave para cada tipo de documento
  const indicadores = {
    factura: ['factura', 'invoice', 'nº', 'número', 'total', 'importe', 'iva', 'base imponible'],
    albaran: ['albarán', 'albaran', 'entrega', 'mercancía', 'pedido', 'referencia'],
    contrato: ['contrato', 'acuerdo', 'cláusula', 'condiciones', 'vigencia', 'firma'],
    presupuesto: ['presupuesto', 'presupuesto', 'oferta', 'cotización', 'válido hasta']
  };
  
  // Contar coincidencias para cada tipo
  const scores = Object.entries(indicadores).map(([tipo, palabras]) => {
    const score = palabras.reduce((acc, palabra) => {
      return acc + (texto.includes(palabra) ? 1 : 0);
    }, 0);
    return { tipo, score };
  });
  
  // Ordenar por score y devolver el tipo con mayor puntuación
  scores.sort((a, b) => b.score - a.score);
  
  return scores[0].score > 0 ? scores[0].tipo as any : 'otro';
}

export async function processMultipleDocuments(files: Array<{ buffer: Buffer; filename: string }>): Promise<DocumentoOCR[]> {
  const resultados: DocumentoOCR[] = [];
  
  for (const file of files) {
    try {
      const resultado = await analyzeDocumentOCR(file.buffer, file.filename);
      
      const documentoOCR: DocumentoOCR = {
        nombre: file.filename,
        contenido: resultado.contenido,
        precision: resultado.precision,
        cantidadDetectada: resultado.cantidadDetectada,
        fechaDetectada: resultado.fechaDetectada,
        tipoDocumento: resultado.tipoDocumento
      };
      
      // Validar con Zod
      const validation = DocumentoOCRSchema.safeParse(documentoOCR);
      if (validation.success) {
        resultados.push(validation.data);
      } else {
        console.warn(`Error validando documento OCR ${file.filename}:`, validation.error);
      }
      
    } catch (error) {
      console.error(`Error procesando documento ${file.filename}:`, error);
    }
  }
  
  return resultados;
}
