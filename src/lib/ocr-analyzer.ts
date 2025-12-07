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
  // TEMPORALMENTE: Deshabilitar OCR en servidor para evitar problemas con workers
  // TODO: Implementar OCR alternativo o mover a cliente
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // En servidor, devolver resultado básico sin OCR para evitar problemas con workers
    console.log(`⚠️ OCR deshabilitado en servidor para ${filename}. Usando metadatos básicos.`);
    return {
      contenido: `[Documento: ${filename}]`,
      precision: 0,
      cantidadDetectada: undefined,
      fechaDetectada: undefined,
      tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
    };
  }
  
  // En cliente, intentar OCR si está disponible
  let worker: any = null;
  
  try {
    worker = await createWorker('spa', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          // Solo loggear progreso si es necesario
        }
      }
    });
    
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
    
  } catch (error: any) {
    // Si el OCR falla, devolver resultado básico
    console.warn(`⚠️ Error en OCR para ${filename}, usando resultado básico:`, error.message);
    
    return {
      contenido: `[OCR no disponible: ${error.message}]`,
      precision: 0,
      cantidadDetectada: undefined,
      fechaDetectada: undefined,
      tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError: any) {
        console.warn('⚠️ Error terminando worker OCR:', terminateError.message);
      }
    }
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
        // Aún así, agregar un resultado básico para que el flujo continúe
        resultados.push({
          nombre: file.filename,
          contenido: resultado.contenido || `Documento: ${file.filename}`,
          precision: resultado.precision || 0,
          cantidadDetectada: resultado.cantidadDetectada,
          fechaDetectada: resultado.fechaDetectada,
          tipoDocumento: resultado.tipoDocumento || 'otro'
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Error procesando documento ${file.filename}:`, error.message);
      // Agregar resultado básico para que el flujo continúe
      resultados.push({
        nombre: file.filename,
        contenido: `[Error procesando documento: ${error.message}]`,
        precision: 0,
        cantidadDetectada: undefined,
        fechaDetectada: undefined,
        tipoDocumento: 'otro'
      });
    }
  }
  
  return resultados;
}
